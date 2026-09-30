from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOTS = (PROJECT_ROOT / "src", PROJECT_ROOT / "public")


def has_alpha(image: Image.Image) -> bool:
    return "A" in image.getbands() or "transparency" in image.info


def composite_rgb(image: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    canvas = Image.new("RGBA", rgba.size, (*background, 255))
    return Image.alpha_composite(canvas, rgba).convert("RGB")


def psnr(first: Image.Image, second: Image.Image) -> float:
    difference = ImageChops.difference(first, second)
    rms = ImageStat.Stat(difference).rms
    mean_square_error = sum(value * value for value in rms) / len(rms)
    if mean_square_error == 0:
        return math.inf
    return 20 * math.log10(255 / math.sqrt(mean_square_error))


def quality_for(path: Path) -> int:
    if path.parent.name and path.name == "cover.png" and "music" in path.parts:
        return 88
    if "branding" in path.parts:
        return 95
    return 92


def optimize(path: Path) -> dict[str, object]:
    destination = path.with_suffix(".webp")
    quality = quality_for(path)

    with Image.open(path) as source:
        source.load()
        source_has_alpha = has_alpha(source)
        prepared = source.convert("RGBA" if source_has_alpha else "RGB")
        prepared.save(
            destination,
            format="WEBP",
            quality=quality,
            method=6,
            lossless=False,
            exact=False,
        )

        with Image.open(destination) as optimized:
            optimized.load()
            if optimized.size != source.size:
                raise RuntimeError(f"Las dimensiones cambiaron: {path}")
            if source_has_alpha and "A" not in optimized.getbands():
                raise RuntimeError(f"Se perdió la transparencia: {path}")
            if source_has_alpha:
                original_alpha = prepared.getchannel("A")
                optimized_alpha = optimized.convert("RGBA").getchannel("A")
                if ImageChops.difference(original_alpha, optimized_alpha).getbbox() is not None:
                    raise RuntimeError(f"El canal alfa cambió: {path}")

            scores = [
                psnr(composite_rgb(prepared, background), composite_rgb(optimized, background))
                for background in ((255, 255, 255), (20, 20, 20))
            ]

    return {
        "source": path.relative_to(PROJECT_ROOT).as_posix(),
        "destination": destination.relative_to(PROJECT_ROOT).as_posix(),
        "original_bytes": path.stat().st_size,
        "optimized_bytes": destination.stat().st_size,
        "quality": quality,
        "minimum_psnr": min(scores),
        "alpha": source_has_alpha,
    }


def main() -> None:
    sources = sorted(
        path
        for root in IMAGE_ROOTS
        for path in root.rglob("*.png")
        if path.is_file()
    )
    results = [optimize(path) for path in sources]
    original_total = sum(int(result["original_bytes"]) for result in results)
    optimized_total = sum(int(result["optimized_bytes"]) for result in results)

    for result in results:
        reduction = 100 * (1 - int(result["optimized_bytes"]) / int(result["original_bytes"]))
        print(
            f"{result['source']} -> {result['destination']} | "
            f"{reduction:.1f}% menos | PSNR {float(result['minimum_psnr']):.1f} dB | "
            f"alfa={'sí' if result['alpha'] else 'no'}"
        )

    print(f"ARCHIVOS={len(results)}")
    print(f"ORIGINAL_BYTES={original_total}")
    print(f"OPTIMIZED_BYTES={optimized_total}")
    print(f"REDUCTION_PERCENT={100 * (1 - optimized_total / original_total):.1f}")


if __name__ == "__main__":
    main()
