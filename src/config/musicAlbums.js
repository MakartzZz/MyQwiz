export const MUSIC_ALBUM_STORAGE_KEY = "myqwiz:music-album";

export const musicAlbums = [
  {
    id: "bosque-de-cristal",
    title: "Bosque de Cristal",
    description: "Fantasía ambiental, ocarina y ruinas entre la niebla.",
    cover: "/music/bosque-de-cristal/cover.webp",
    tracks: [
      { title: "Paseo por el Bosque", src: "/music/bosque-de-cristal/01-paseo-por-el-bosque.mp3" },
      { title: "Ruinas antiguas en la niebla", src: "/music/bosque-de-cristal/02-ruinas-antiguas-en-la-niebla.mp3" },
      { title: "Susurros del Claro", src: "/music/bosque-de-cristal/03-susurros-del-claro.mp3" },
      { title: "Cristales entre la Niebla", src: "/music/bosque-de-cristal/04-cristales-entre-la-niebla.mp3" },
    ],
  },
  {
    id: "orbita-serena",
    title: "Órbita Serena",
    description: "Ambient electrónico para concentración profunda.",
    cover: "/music/orbita-serena/cover.webp",
    tracks: [
      { title: "Contemplando planetas", src: "/music/orbita-serena/01-contemplando-planetas.mp3" },
      { title: "Enfoque constante", src: "/music/orbita-serena/02-enfoque-constante.mp3" },
      { title: "Deriva sin Gravedad", src: "/music/orbita-serena/03-deriva-sin-gravedad.mp3" },
      { title: "Horizonte Silencioso", src: "/music/orbita-serena/04-horizonte-silencioso.mp3" },
    ],
  },
  {
    id: "tinta-y-madera",
    title: "Tinta y Madera",
    description: "Piano íntimo, cuerdas y ambiente de biblioteca.",
    cover: "/music/tinta-y-madera/cover.webp",
    tracks: [
      { title: "Estudio cálido", src: "/music/tinta-y-madera/01-estudio-calido.mp3" },
      { title: "Sala de lectura tranquila", src: "/music/tinta-y-madera/02-sala-de-lectura-tranquila.mp3" },
      { title: "Tarde entre Páginas", src: "/music/tinta-y-madera/03-tarde-entre-paginas.mp3" },
      { title: "Luz sobre el Escritorio", src: "/music/tinta-y-madera/04-luz-sobre-el-escritorio.mp3" },
    ],
  },
  {
    id: "cafe-de-medianoche",
    title: "Café de Medianoche",
    description: "Lo-fi cálido y ambiente nocturno para estudiar con calma.",
    cover: "/music/cafe-de-medianoche/cover.webp",
    tracks: [
      { title: "Foco y concentración", src: "/music/cafe-de-medianoche/01-foco-y-concentracion.mp3" },
      { title: "Flujo de enfoque", src: "/music/cafe-de-medianoche/02-flujo-de-enfoque.mp3" },
      { title: "Mesa junto a la Ventana", src: "/music/cafe-de-medianoche/03-mesa-junto-a-la-ventana.mp3" },
    ],
  },
  {
    id: "ritmo-trivia",
    title: "Ritmo Trivia",
    description: "Beats vibrantes para pensar, responder y seguir el ritmo.",
    cover: "/music/ritmo-trivia/cover.webp",
    tracks: [
      { title: "Trivia Groove", src: "/music/ritmo-trivia/01-trivia-groove.mp3" },
      { title: "Trivia Pulse", src: "/music/ritmo-trivia/02-trivia-pulse.mp3" },
      { title: "Ronda Relámpago", src: "/music/ritmo-trivia/03-ronda-relampago.mp3" },
      { title: "Respuesta en Ritmo", src: "/music/ritmo-trivia/04-respuesta-en-ritmo.mp3" },
    ],
  },
  {
    id: "trivia-lounge",
    title: "Trivia Lounge",
    description: "Jazz elegante y ritmo lounge para pensar sin perder el swing.",
    cover: "/music/trivia-lounge/cover.webp",
    tracks: [
      { title: "Lounge Shuffle", src: "/music/trivia-lounge/01-lounge-shuffle.mp3" },
      { title: "Casino Lounge", src: "/music/trivia-lounge/02-casino-lounge.mp3" },
      { title: "Última Ronda", src: "/music/trivia-lounge/03-ultima-ronda.mp3" },
    ],
  },
  {
    id: "impulso-solar",
    title: "Impulso Solar",
    description: "Ritmos alegres para estudiar con motivación.",
    cover: "/music/impulso-solar/cover.webp",
    tracks: [
      { title: "Enfoque hacia adelante", src: "/music/impulso-solar/01-enfoque-hacia-adelante.mp3" },
      { title: "Enfoque tranquilo", src: "/music/impulso-solar/02-enfoque-tranquilo.mp3" },
      { title: "Mañana en Marcha", src: "/music/impulso-solar/03-manana-en-marcha.mp3" },
      { title: "Rumbo a la Luz", src: "/music/impulso-solar/04-rumbo-a-la-luz.mp3" },
    ],
  },
  {
    id: "jardin-de-papel",
    title: "Jardín de Papel",
    description: "Koto, shakuhachi y paisajes serenos inspirados en Japón.",
    cover: "/music/jardin-de-papel/cover.webp",
    tracks: [
      { title: "Quietud del Jardín", src: "/music/jardin-de-papel/01-quietud-del-jardin.mp3" },
      { title: "Hojas sobre el Agua", src: "/music/jardin-de-papel/02-hojas-sobre-el-agua.mp3" },
      { title: "Brisa entre Arces", src: "/music/jardin-de-papel/03-brisa-entre-arces.mp3" },
      { title: "Sendero de Piedra", src: "/music/jardin-de-papel/04-sendero-de-piedra.mp3" },
    ],
  },
];

export const DEFAULT_MUSIC_ALBUM = musicAlbums[0].id;
