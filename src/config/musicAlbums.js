export const MUSIC_ALBUM_STORAGE_KEY = "myqwiz:music-album";

export const musicAlbums = [
  {
    id: "bosque-de-cristal",
    title: "Bosque de Cristal",
    description: "Fantasía ambiental, ocarina y ruinas entre la niebla.",
    cover: "/music/bosque-de-cristal/cover.png",
    tracks: [
      { title: "Paseo por el Bosque", src: "/music/bosque-de-cristal/01-paseo-por-el-bosque.mp3" },
      { title: "Ruinas antiguas en la niebla", src: "/music/bosque-de-cristal/02-ruinas-antiguas-en-la-niebla.mp3" },
    ],
  },
  {
    id: "orbita-serena",
    title: "Órbita Serena",
    description: "Ambient electrónico para concentración profunda.",
    cover: "/music/orbita-serena/cover.png",
    tracks: [
      { title: "Contemplando planetas", src: "/music/orbita-serena/01-contemplando-planetas.mp3" },
      { title: "Enfoque constante", src: "/music/orbita-serena/02-enfoque-constante.mp3" },
    ],
  },
  {
    id: "tinta-y-madera",
    title: "Tinta y Madera",
    description: "Piano íntimo, cuerdas y ambiente de biblioteca.",
    cover: "/music/tinta-y-madera/cover.png",
    tracks: [
      { title: "Estudio cálido", src: "/music/tinta-y-madera/01-estudio-calido.mp3" },
      { title: "Sala de lectura tranquila", src: "/music/tinta-y-madera/02-sala-de-lectura-tranquila.mp3" },
    ],
  },
  {
    id: "cafe-de-medianoche",
    title: "Café de Medianoche",
    description: "Lo-fi cálido y jazz suave para estudiar de noche.",
    cover: "/music/cafe-de-medianoche/cover.png",
    tracks: [
      { title: "Foco y concentración", src: "/music/cafe-de-medianoche/01-foco-y-concentracion.mp3" },
      { title: "Flujo de enfoque", src: "/music/cafe-de-medianoche/02-flujo-de-enfoque.mp3" },
    ],
  },
  {
    id: "lluvia-en-la-ventana",
    title: "Lluvia en la Ventana",
    description: "Piano minimalista y una tarde de lluvia.",
    cover: "/music/lluvia-en-la-ventana/cover.png",
    tracks: [],
  },
  {
    id: "impulso-solar",
    title: "Impulso Solar",
    description: "Ritmos alegres para estudiar con motivación.",
    cover: "/music/impulso-solar/cover.png",
    tracks: [
      { title: "Enfoque hacia adelante", src: "/music/impulso-solar/01-enfoque-hacia-adelante.mp3" },
      { title: "Enfoque tranquilo", src: "/music/impulso-solar/02-enfoque-tranquilo.mp3" },
    ],
  },
];

export const DEFAULT_MUSIC_ALBUM = musicAlbums[0].id;
