// Generador de Programas Turísticos — datos copiados del sitio original (turismoavatar.cl/programas),
// basado en el Manual SERNATUR de Diseño de Experiencias Turísticas.
// Cada programa: narrativa, momento cumbre (clímax), precio sugerido, factor WOW y episodios por día
// (h = hora, a = acción, l = lugar, e = efecto emocional buscado).
export type Perfil = 'aventurero' | 'familia' | 'romantico' | 'cultural' | 'enoturismo' | 'indigena';
export type Duracion = 'medio' | 'dia' | '2d';
export interface Episodio { h: string; a: string; l: string; e: string }
export interface Programa {
  nombre: string;
  narrativa: string;
  climax: string;
  precio: string;
  wow: string;
  dias: { titulo: string; ep: Episodio[] }[];
}

export const PERFILES: { id: Perfil; desc: string }[] = [
  { id: 'aventurero', desc: 'Adrenalina, naturaleza, desafío físico' },
  { id: 'familia', desc: 'Actividades para todas las edades' },
  { id: 'romantico', desc: 'Pareja, experiencias íntimas' },
  { id: 'cultural', desc: 'Historia, gastronomía, identidad local' },
  { id: 'enoturismo', desc: 'Vino patrimonial del Valle del Itata' },
  { id: 'indigena', desc: 'Comunidad lafkenche, cosmovisión mapuche' },
];
export const ORIGENES: { id: string; label: string; desc?: string }[] = [
  { id: 'Chile (otras regiones)', label: 'Chile', desc: 'otras regiones' },
  { id: 'Latinoamérica', label: 'Latinoamérica' },
  { id: 'Europa / EEUU', label: 'Europa / EEUU' },
  { id: 'Corporativo', label: 'Corporativo' },
  { id: 'Estudiantes', label: 'Estudiantes' },
];
export const DURACIONES: { id: Duracion; label: string; desc: string }[] = [
  { id: 'medio', label: 'Medio día', desc: 'sin alojamiento' },
  { id: 'dia', label: '1 día completo', desc: 'sin alojamiento' },
  { id: '2d', label: '2 días', desc: '1 noche' },
];

export const EMOJIS: Record<Perfil, string> = { aventurero:"🧗", familia:"👨‍👩‍👧", romantico:"🌅", cultural:"🏛️", enoturismo:"🍷", indigena:"🌿" };
export const LABELS: Record<Perfil, string> = { aventurero:"Aventurero", familia:"Familia", romantico:"Romántico", cultural:"Cultural", enoturismo:"Enoturismo", indigena:"Turismo Indígena" };
export const DUR_LABEL: Record<Duracion, string> = { medio:"Medio día", dia:"1 día completo", "2d":"2 días / 1 noche" };

export const PROGRAMAS: Record<Perfil, Record<Duracion, Programa>> = {
  aventurero: {
    medio: {
      nombre:"Costanera Extrema Express",
      narrativa:"Concepción tiene un río que la define. En medio día descubres la ciudad desde el agua y sientes la energía del Biobío sin salir del área metropolitana.",
      climax:"Kayak de travesía por la costanera del río Biobío con vista al puente Llacolén",
      precio:"$35.000 – $50.000 CLP / persona",
      wow:"Video corto del recorrido enviado por WhatsApp al finalizar",
      dias:[{ titulo:"Medio día — Biobío desde el río", ep:[
        {h:"09:00",a:"Punto de encuentro, briefing y equipo",l:"Costanera del Biobío",e:"Anticipación, confianza en el guía"},
        {h:"09:30",a:"🌊 CLÍMAX: Kayak de travesía con vista al puente Llacolén",l:"Río Biobío, sector urbano",e:"Adrenalina controlada, perspectiva nueva de la ciudad"},
        {h:"11:30",a:"Regreso, fotos grupales y grabación del video",l:"Base costanera",e:"Satisfacción, recuerdo compartible en redes"},
        {h:"12:00",a:"Cierre con bebida energética local y souvenir",l:"Base",e:"Memorabilidad, boca a boca garantizado"},
      ]}],
    },
    dia: {
      nombre:"Salto del Laja y Rafting en un Día",
      narrativa:"Una catarata monumental al amanecer y rafting en el río antes de que caiga la tarde. El Biobío salvaje en modo intensivo.",
      climax:"Rafting grado III–IV en el río Biobío sector Quilaco",
      precio:"$75.000 – $95.000 CLP / persona",
      wow:"Foto del rafting impresa y entregada al regreso",
      dias:[{ titulo:"Día completo — Cascada y río", ep:[
        {h:"07:00",a:"Salida desde Concepción hacia Salto del Laja",l:"Ruta 5 Sur",e:"Anticipación, relato del río en el camino"},
        {h:"09:00",a:"Visita al Salto del Laja — pasarelas y miradores",l:"Salto del Laja",e:"Asombro visual, primer impacto emocional"},
        {h:"11:30",a:"🌊 CLÍMAX: Rafting grado III–IV en el Biobío",l:"Río Biobío, sector Quilaco",e:"Adrenalina máxima, logro colectivo memorable"},
        {h:"13:30",a:"Almuerzo a orillas del río — asado campestre",l:"Orilla del Biobío",e:"Celebración, comunidad entre viajeros"},
        {h:"16:30",a:"Regreso a Concepción + foto impresa",l:"Concepción",e:"Souvenir físico, recuerdo permanente"},
      ]}],
    },
    "2d": {
      nombre:"Fuerza del Biobío",
      narrativa:"El río Biobío es la columna vertebral de una región indómita. Dos días para sentir su poder desde la ciudad hasta el corazón precordillerano.",
      climax:"Rafting grado III–IV en el río Biobío + fogón pehuenche nocturno",
      precio:"$130.000 – $165.000 CLP / persona",
      wow:"Certificado de aventurero Biobío + foto impresa del descenso",
      dias:[
        { titulo:"Día 1 — Concepción y traslado al interior", ep:[
          {h:"09:00",a:"City tour: costanera del Biobío y murales MURO",l:"Concepción centro",e:"Orientación y primer impacto visual"},
          {h:"13:00",a:"Almuerzo en Mercado Central — gastronomía local",l:"Mercado Central",e:"Primer sabor auténtico del Biobío"},
          {h:"15:30",a:"Traslado hacia Los Ángeles / sector Quilaco",l:"Ruta interior Biobío",e:"Transición ciudad-naturaleza, anticipación"},
          {h:"20:00",a:"Fogón nocturno con relato del río y el pueblo pehuenche",l:"Lodge sector Quilaco",e:"Vínculo emocional con el territorio"},
        ]},
        { titulo:"Día 2 — El río ⭐ CLÍMAX", ep:[
          {h:"08:00",a:"Desayuno + briefing completo de seguridad y equipo",l:"Lodge",e:"Confianza, preparación, anticipación máxima"},
          {h:"09:30",a:"🌊 CLÍMAX: Rafting grado III–IV en el río Biobío",l:"Río Biobío, sector Quilaco",e:"Adrenalina máxima, logro colectivo"},
          {h:"13:00",a:"Almuerzo celebración a orillas del río",l:"Orilla del Biobío",e:"Celebración del logro"},
          {h:"15:00",a:"Parada en Salto del Laja de regreso",l:"Salto del Laja",e:"Cierre visual impactante"},
          {h:"17:30",a:"Regreso + certificado + foto impresa",l:"Concepción",e:"Orgullo, memorabilidad permanente"},
        ]},
      ],
    },
  },
  familia: {
    medio: {
      nombre:"Concepción con los Chicos",
      narrativa:"Medio día para que los niños descubran Concepción con ojos nuevos: murales gigantes, el río más grande de Chile y sabores que van a querer repetir.",
      climax:"Recorrido en bicicleta familiar por la costanera del Biobío",
      precio:"$20.000 adulto / $10.000 niño",
      wow:"Pasaporte viajero ilustrado con sello de la costanera para cada niño",
      dias:[{ titulo:"Medio día familiar en Concepción", ep:[
        {h:"10:00",a:"Tour de murales MURO — los niños lideran la búsqueda",l:"Barrio Universitario, Concepción",e:"Asombro visual, los niños protagonizan"},
        {h:"11:00",a:"🚲 CLÍMAX: Bicicleta familiar por la costanera del Biobío",l:"Costanera del Biobío",e:"Libertad, juego, vista al río más grande de Chile"},
        {h:"12:30",a:"Almuerzo en el mercado — cada uno elige su plato",l:"Mercado Central",e:"Autonomía, sabores locales"},
        {h:"14:00",a:"Entrega de pasaportes viajeros con sello",l:"Concepción",e:"Orgullo infantil, ganas de más sellos"},
      ]}],
    },
    dia: {
      nombre:"Salto del Laja Familiar",
      narrativa:"Una catarata tan grande que los niños no tienen palabras. Un día diseñado para que toda la familia tenga el mismo 'guau' al mismo tiempo.",
      climax:"Las pasarelas del Salto del Laja — la catarata más famosa de Chile",
      precio:"$45.000 adulto / $28.000 niño",
      wow:"Pasaporte viajero con sello del Salto para cada niño",
      dias:[{ titulo:"Día familiar en el Salto del Laja", ep:[
        {h:"08:30",a:"Salida con cuento del río Biobío para los niños en el bus",l:"Ruta 5 Sur",e:"Los niños ya están dentro de la historia"},
        {h:"10:00",a:"💦 CLÍMAX: Pasarelas y miradores del Salto del Laja",l:"Salto del Laja",e:"Asombro colectivo, grito familiar, fotos memorables"},
        {h:"12:30",a:"Picnic en área verde junto a las cascadas",l:"Área verde Salto del Laja",e:"Juego libre, pausa en la naturaleza"},
        {h:"14:30",a:"Parada en quesería artesanal en ruta de regreso",l:"Camino Los Ángeles–Concepción",e:"Curiosidad sobre los alimentos, degustación"},
        {h:"17:00",a:"Regreso + pasaporte con sello del Salto",l:"Concepción",e:"Memorabilidad infantil total"},
      ]}],
    },
    "2d": {
      nombre:"Biobío en Familia: Cascadas e Historia",
      narrativa:"El Biobío tiene todo para que una familia vuelva a casa con los ojos brillantes. Historia que emociona a grandes y chicos, una catarata monumental y sabores para repetir.",
      climax:"Las pasarelas del Salto del Laja + visita al Chiflón del Diablo en Lota",
      precio:"$90.000 adulto / $55.000 niño",
      wow:"Pasaporte viajero completo con sellos + foto familiar impresa",
      dias:[
        { titulo:"Día 1 — Concepción familiar", ep:[
          {h:"10:00",a:"Tour murales MURO a pie — los niños lideran",l:"Barrio Universitario",e:"Los niños protagonizan la experiencia"},
          {h:"11:30",a:"Bicicleta por la costanera del Biobío",l:"Costanera del Biobío",e:"Libertad y juego junto al río"},
          {h:"13:00",a:"Almuerzo en Mercado Central — cada uno elige",l:"Mercado Central",e:"Autonomía, gastronomía local"},
          {h:"15:30",a:"Visita al Chiflón del Diablo en Lota (tour apto niños)",l:"Parque Isidora Cousiño, Lota",e:"Historia viva que emociona a todas las edades"},
          {h:"19:30",a:"Cena y descanso en hotel céntrico cómodo",l:"Concepción",e:"Comodidad familiar, recarga para el día fuerte"},
        ]},
        { titulo:"Día 2 — Salto del Laja ⭐ CLÍMAX", ep:[
          {h:"08:30",a:"Salida con cuento del río en el bus",l:"Ruta 5 Sur",e:"Anticipación máxima"},
          {h:"10:00",a:"💦 CLÍMAX: Recorrido completo por pasarelas del Salto del Laja",l:"Salto del Laja",e:"Asombro colectivo, grito familiar, fotos épicas"},
          {h:"12:30",a:"Picnic familiar junto a las cascadas",l:"Área verde del Salto",e:"Juego libre, pausa memorable"},
          {h:"14:30",a:"Parada en quesería artesanal de regreso",l:"Camino Los Ángeles–Concepción",e:"Curiosidad, degustación"},
          {h:"17:00",a:"Regreso + pasaportes completos + foto impresa",l:"Concepción",e:"Memorabilidad total, ganas de volver"},
        ]},
      ],
    },
  },
  romantico: {
    medio: {
      nombre:"Concepción para Dos",
      narrativa:"Medio día para descubrir la Concepción íntima: un mirador secreto, un café de especialidad y el mejor atardecer sobre el río Biobío.",
      climax:"Atardecer en el Cerro Caracol con vista panorámica al río Biobío",
      precio:"$30.000 – $42.000 CLP / pareja",
      wow:"Tarjeta con poema de Gonzalo Rojas, el gran poeta de Concepción",
      dias:[{ titulo:"Medio día romántico en Concepción", ep:[
        {h:"15:00",a:"Tour privado a pie: murales y Barrio Universitario",l:"Concepción centro",e:"Descubrimiento compartido, curiosidad activada"},
        {h:"16:30",a:"🌅 CLÍMAX: Subida al Cerro Caracol — atardecer sobre el Biobío",l:"Cerro Caracol, Concepción",e:"Momento íntimo perfecto, foto de pareja memorable"},
        {h:"18:00",a:"Café de especialidad en Barrio Estación",l:"Barrio Estación",e:"Conversación, calidez, lentitud"},
        {h:"19:00",a:"Entrega tarjeta con poema de Gonzalo Rojas",l:"Barrio Estación",e:"Souvenir literario único de Concepción"},
      ]}],
    },
    dia: {
      nombre:"Mar y Mariscos para Dos",
      narrativa:"El Pacífico sur tiene algo que pocas parejas experimentan: la autenticidad de una caleta donde el mar pone el menú. Un día que termina con el horizonte infinito.",
      climax:"Atardecer con picnic de vino del Itata en los acantilados del Pacífico",
      precio:"$70.000 – $90.000 CLP / pareja",
      wow:"Botella de vino del Itata personalizada con la fecha del día",
      dias:[{ titulo:"Día romántico en la costa", ep:[
        {h:"10:00",a:"Traslado tranquilo a la costa de Arauco o Dichato",l:"Ruta costera Biobío",e:"Transición, primeras vistas al Pacífico"},
        {h:"11:30",a:"Recorrido por caleta artesanal con pescador local",l:"Caleta artesanal",e:"Autenticidad compartida"},
        {h:"13:30",a:"Almuerzo íntimo frente al mar — ceviche, machas, pescado fresco",l:"Restaurant con vista al Pacífico",e:"Placer gastronómico máximo, atmósfera romántica"},
        {h:"17:00",a:"🌅 CLÍMAX: Picnic con vino del Itata en acantilado al atardecer",l:"Acantilados de Arauco o Punta de Parra",e:"Momento irrepetible, intimidad perfecta ante el horizonte"},
        {h:"19:00",a:"Regreso + botella personalizada con la fecha",l:"Concepción",e:"Souvenir íntimo y permanente"},
      ]}],
    },
    "2d": {
      nombre:"Biobío para Dos: Ciudad, Costa y Atardecer",
      narrativa:"Concepción tiene rincones íntimos que pocas parejas descubren. Una ciudad que sorprende, una costa brava que emociona y los sabores más auténticos del sur de Chile.",
      climax:"Picnic de vino del Itata en los acantilados del Pacífico al atardecer",
      precio:"$175.000 – $225.000 CLP / pareja",
      wow:"Caja regalo: botella Itata + queso artesanal + tarjeta con poema de Gonzalo Rojas",
      dias:[
        { titulo:"Día 1 — Concepción íntima", ep:[
          {h:"11:00",a:"Tour privado a pie: murales, campus UdeC, costanera",l:"Concepción centro",e:"Descubrimiento conjunto, conversación"},
          {h:"13:30",a:"Almuerzo en restaurant de autor con cocina local",l:"Barrio Estación",e:"Sofisticación, ambiente romántico"},
          {h:"16:30",a:"Subida al Cerro Caracol al atardecer",l:"Cerro Caracol, Concepción",e:"Perspectiva única, foto íntima de pareja"},
          {h:"20:00",a:"Cena con maridaje de vinos del Itata",l:"Restaurant selecto Concepción",e:"Placer, lentitud, conexión de pareja"},
        ]},
        { titulo:"Día 2 — Costa y clímax ⭐ CLÍMAX", ep:[
          {h:"10:00",a:"Traslado a caleta artesanal de Arauco o Dichato",l:"Ruta costera Biobío",e:"Primeras vistas al Pacífico, anticipación"},
          {h:"11:30",a:"Paseo por caleta de pescadores artesanales",l:"Caleta costera, Arauco",e:"Autenticidad compartida"},
          {h:"13:30",a:"Almuerzo íntimo frente al mar — ceviche, machas, pescado fresco",l:"Restaurant con vista al Pacífico",e:"Placer gastronómico máximo"},
          {h:"17:00",a:"🌅 CLÍMAX: Picnic con vino del Itata en acantilado al atardecer",l:"Acantilados de Arauco",e:"Momento irrepetible, intimidad perfecta"},
          {h:"19:30",a:"Regreso + caja regalo personalizada",l:"Concepción",e:"Souvenir de lujo artesanal, fidelización total"},
        ]},
      ],
    },
  },
  cultural: {
    medio: {
      nombre:"Concepción Cultural Express",
      narrativa:"En medio día recorres lo que hace a Concepción la capital cultural del sur: murales monumentales, el mural más grande de América Latina y el mercado donde la gastronomía local brilla.",
      climax:"Visita al mural 'Presencia de América Latina' en la Casa del Arte UdeC",
      precio:"$22.000 – $32.000 CLP / persona",
      wow:"Mapa cultural de Concepción con los lugares imperdibles",
      dias:[{ titulo:"Medio día cultural en Concepción", ep:[
        {h:"09:30",a:"Tour de murales MURO — arte urbano del Biobío",l:"Barrio Universitario",e:"Asombro visual, contexto artístico contemporáneo"},
        {h:"10:30",a:"🏛️ CLÍMAX: Casa del Arte UdeC — mural de González Camarena",l:"Casa del Arte, UdeC",e:"Impacto cultural profundo, historia de América Latina en una pared"},
        {h:"11:30",a:"Recorrido por el Campus UdeC — patrimonio arquitectónico",l:"Campus UdeC",e:"Belleza académica, identidad cultural del sur"},
        {h:"12:30",a:"Almuerzo en el Mercado Central — gastronomía tradicional",l:"Mercado Central",e:"Sabores auténticos, cierre sensorial"},
        {h:"14:00",a:"Entrega de mapa cultural de Concepción",l:"Concepción",e:"Herramienta para seguir explorando solo"},
      ]}],
    },
    dia: {
      nombre:"Concepción y Lota: Historia Viva",
      narrativa:"Un día que une dos historias que definen al Biobío: la ciudad universitaria que forjó el pensamiento del sur y la ciudad minera que pagó con sangre el carbón que iluminó Chile.",
      climax:"Visita al Chiflón del Diablo — la mina de carbón más profunda de Latinoamérica",
      precio:"$58.000 – $75.000 CLP / persona",
      wow:"Réplica de carbón de Lota + tarjeta con historia del Chiflón del Diablo",
      dias:[{ titulo:"Día completo — Concepción y Lota", ep:[
        {h:"09:30",a:"City tour cultural: murales, Casa del Arte, campus UdeC",l:"Concepción centro",e:"Contexto cultural, orgullo del sur de Chile"},
        {h:"12:30",a:"Almuerzo en Mercado Central con cocina tradicional",l:"Mercado Central",e:"Gastronomía local auténtica"},
        {h:"14:30",a:"Traslado a Lota (40 min)",l:"Lota, provincia de Concepción",e:"Anticipación, cambio de atmósfera"},
        {h:"15:30",a:"⛏️ CLÍMAX: Visita al Chiflón del Diablo con guía especializado",l:"Parque Isidora Cousiño, Lota",e:"Emoción histórica profunda, respeto por los mineros"},
        {h:"17:30",a:"Paseo por Parque Cousiño — jardines patrimoniales con vista al mar",l:"Lota Alto",e:"Belleza inesperada, contraste histórico-natural"},
        {h:"19:00",a:"Regreso + réplica de carbón + tarjeta histórica",l:"Concepción",e:"Souvenir con significado"},
      ]}],
    },
    "2d": {
      nombre:"Concepción Profunda: Ciudad, Mina y Costa",
      narrativa:"Dos días para conocer la identidad más profunda del Biobío. Arte monumental, historia minera que emociona y la costa donde el Pacífico sur golpea sin aviso.",
      climax:"Chiflón del Diablo en Lota + almuerzo de mariscos frente al Pacífico",
      precio:"$125.000 – $160.000 CLP / persona",
      wow:"Libro de historia del Biobío + réplica de carbón de Lota",
      dias:[
        { titulo:"Día 1 — Concepción cultural y gastronómica", ep:[
          {h:"10:00",a:"Tour cultural: murales MURO, Casa del Arte, barrios históricos",l:"Concepción centro",e:"Revelación — Concepción como capital cultural real del sur"},
          {h:"13:00",a:"Almuerzo gastronómico: caldillo, machas, empanadas del sur",l:"Mercado o restaurant local",e:"Identidad culinaria del Biobío"},
          {h:"15:30",a:"⛏️ Chiflón del Diablo + Parque Cousiño en Lota",l:"Lota",e:"Historia viva, emoción y respeto ante la historia obrera"},
          {h:"20:00",a:"Cena en restaurant de autor con vino del Itata",l:"Barrio Estación, Concepción",e:"Sofisticación gastronómica, placer"},
        ]},
        { titulo:"Día 2 — Costa del Biobío ⭐ CLÍMAX", ep:[
          {h:"10:00",a:"Traslado a caleta artesanal en la costa de Arauco",l:"Ruta costera Biobío",e:"Paisaje en transición, anticipa lo que viene"},
          {h:"11:30",a:"Recorrido por caleta con pescador artesanal",l:"Caleta costera, Arauco",e:"Autenticidad, contacto humano real"},
          {h:"13:00",a:"🌊 CLÍMAX: Almuerzo de mariscos frescos frente al Pacífico",l:"Restaurant costero",e:"Placer gastronómico máximo del sur"},
          {h:"15:30",a:"Caminata por acantilados con vista al mar bravo",l:"Litoral de Arauco",e:"Belleza salvaje, contemplación"},
          {h:"17:30",a:"Regreso + libro de historia + réplica de carbón",l:"Concepción",e:"Souvenir con alma, dos historias del Biobío"},
        ]},
      ],
    },
  },
  enoturismo: {
    medio: {
      nombre:"Primera Copa del Itata",
      narrativa:"El Valle del Itata produce los vinos más antiguos de Chile, con cepas que llegaron hace 400 años. En medio día entiendes por qué el mundo vitivinícola lo está mirando con atención.",
      climax:"Degustación de País y Moscatel patrimonial directamente con el viñatero",
      precio:"$42.000 – $58.000 CLP / persona",
      wow:"Copa de cristal grabada 'Valle del Itata' de recuerdo",
      dias:[{ titulo:"Medio día en el Valle del Itata", ep:[
        {h:"10:00",a:"Traslado desde Concepción al Valle del Itata (1h)",l:"Ruta a Chillán, desvío Itata",e:"Paisaje que se transforma en viñedos centenarios"},
        {h:"11:30",a:"Recorrido a pie por viñedos patrimoniales — cepas de 100+ años",l:"Viña familiar, Valle del Itata",e:"Asombro ante lo antiguo, conexión con la historia"},
        {h:"12:30",a:"🍷 CLÍMAX: Degustación de País y Moscatel con el viñatero",l:"Bodega familiar",e:"Sabor irrepetible, autenticidad extrema"},
        {h:"13:30",a:"Pan amasado, queso y embutidos locales con el último vino",l:"Comedor del fundo",e:"Placer y calidez rural"},
        {h:"14:30",a:"Regreso + copa de cristal grabada",l:"Concepción",e:"Souvenir elegante y único"},
      ]}],
    },
    dia: {
      nombre:"Itata Profundo",
      narrativa:"Un día completo en el Valle del Itata: viñedos centenarios, bodega histórica, campo abierto y una mesa que reúne el mejor vino con los productos del territorio.",
      climax:"Picnic entre las viñas con degustación vertical de cosechas del Itata",
      precio:"$82.000 – $105.000 CLP / persona",
      wow:"Botella personalizada con etiqueta impresa de tu visita al Itata",
      dias:[{ titulo:"Día completo en el Valle del Itata", ep:[
        {h:"09:00",a:"Traslado al Valle del Itata",l:"Ruta al Itata",e:"Anticipación, paisaje rural en transformación"},
        {h:"10:30",a:"Recorrido entre cepas centenarias — historia y geología del valle",l:"Viñedos patrimoniales",e:"Conocimiento que da valor al vino que vendrá"},
        {h:"12:30",a:"🍷 CLÍMAX: Picnic entre las viñas — degustación vertical con el viñatero",l:"Entre los viñedos",e:"Experiencia sensorial y emocional máxima"},
        {h:"15:00",a:"Visita a bodega histórica — barricas y procesos artesanales",l:"Bodega familiar",e:"Contexto, comprensión del proceso"},
        {h:"17:00",a:"Taller de ensamblaje: crea tu propio blend del Itata",l:"Sala de catas",e:"Co-creación, orgullo del resultado"},
        {h:"19:00",a:"Regreso + botella personalizada",l:"Concepción",e:"Souvenir premium único"},
      ]}],
    },
    "2d": {
      nombre:"Noche en las Viñas del Itata",
      narrativa:"Quedarse a dormir en el Valle del Itata es una experiencia distinta. Sin apuro, con el ritmo del campo y una mesa que revela la identidad de este valle único.",
      climax:"Cena de maridaje al atardecer en la terraza del viñedo + amanecer entre las viñas",
      precio:"$195.000 – $255.000 CLP / pareja",
      wow:"Caja curada: 2 botellas Itata + queso artesanal + tarjeta manuscrita del viñatero",
      dias:[
        { titulo:"Día 1 — Llegada al valle y primer contacto", ep:[
          {h:"11:00",a:"Traslado al Valle del Itata desde Concepción",l:"Ruta desde Concepción",e:"Primeras viñas en el horizonte, anticipación"},
          {h:"12:30",a:"Almuerzo campestre en el fundo — cocina de temporada",l:"Comedor del viñedo",e:"Primer sabor del territorio"},
          {h:"15:00",a:"Recorrido por viñedos centenarios + taller de cata introductoria",l:"Viñedos y bodega",e:"Curiosidad activada, conocimiento base"},
          {h:"18:00",a:"🍷 CLÍMAX: Cena de maridaje en terraza del viñedo al atardecer",l:"Terraza del fundo",e:"Belleza, placer, lentitud, memorabilidad"},
          {h:"21:00",a:"Alojamiento en cabaña boutique entre los viñedos",l:"Cabaña del fundo",e:"Inmersión total, despertar entre las viñas"},
        ]},
        { titulo:"Día 2 — Vendimia y regreso", ep:[
          {h:"08:00",a:"Desayuno lento con vista al viñedo",l:"Cabaña o comedor",e:"El mejor amanecer del viaje"},
          {h:"10:00",a:"Participación en vendimia o poda según temporada",l:"Viñedos",e:"Participación real en el ciclo del vino"},
          {h:"12:30",a:"Taller de ensamblaje: tu blend personal del Itata",l:"Sala de catas o bodega",e:"Co-creación, orgullo del resultado"},
          {h:"14:00",a:"Almuerzo de cierre + entrega caja curada",l:"Comedor del fundo",e:"Souvenir premium, celebración del viaje"},
          {h:"16:00",a:"Regreso a Concepción",l:"Concepción",e:"Cierre perfecto"},
        ]},
      ],
    },
  },
  indigena: {
    medio: {
      nombre:"Voces Lafkenche Express",
      narrativa:"En pocas horas te conectas con el pueblo lafkenche, guardianes del mar del Biobío. Una cosmovisión que coexiste con la modernidad a menos de una hora de Concepción.",
      climax:"Taller de cestería o tejido con artesana lafkenche de la comunidad",
      precio:"$30.000 – $45.000 CLP / persona",
      wow:"Artesanía pequeña hecha durante el taller para llevar a casa",
      dias:[{ titulo:"Medio día — Encuentro lafkenche", ep:[
        {h:"09:30",a:"Traslado a comunidad lafkenche costera en Arauco",l:"Provincia de Arauco",e:"Transición, anticipación, paisaje costero"},
        {h:"10:30",a:"Bienvenida ceremonial y relato de la cosmovisión lafkenche del mar",l:"Ruka comunitaria",e:"Respeto, apertura cultural, emoción"},
        {h:"11:30",a:"🌿 CLÍMAX: Taller de cestería o tejido con artesana de la comunidad",l:"Ruka o espacio comunitario",e:"Co-creación, conexión humana profunda"},
        {h:"13:00",a:"Degustación de alimentos tradicionales lafkenche",l:"Comunidad",e:"Sabores únicos, gratitud y reciprocidad"},
        {h:"14:00",a:"Regreso con artesanía propia",l:"Concepción",e:"Souvenir con historia real detrás"},
      ]}],
    },
    dia: {
      nombre:"Lafkenche: El Pueblo del Mar",
      narrativa:"Un día completo con el pueblo lafkenche. Historia, conocimientos del mar, gastronomía ancestral y su manera de entender el mundo coexistiendo con el Pacífico.",
      climax:"Participación en actividad comunitaria real: tejido, pesca o relato ceremonial",
      precio:"$65.000 – $85.000 CLP / persona",
      wow:"Álbum fotográfico digital del día enviado por email",
      dias:[{ titulo:"Día completo con la comunidad lafkenche", ep:[
        {h:"08:30",a:"Traslado desde Concepción a la costa de Arauco",l:"Ruta costera Biobío",e:"Anticipación, paisaje que cambia"},
        {h:"10:00",a:"Bienvenida y relato del territorio lafkenche",l:"Comunidad costera, Arauco",e:"Respeto y apertura cultural"},
        {h:"11:00",a:"Recorrido costero con guía lafkenche — lectura de las mareas",l:"Costa de Arauco",e:"Conocimiento ancestral del mar, asombro"},
        {h:"13:00",a:"Almuerzo comunitario — productos del mar y la tierra",l:"Ruka comunitaria",e:"Autenticidad máxima, intercambio cultural real"},
        {h:"15:00",a:"🌿 CLÍMAX: Participación en actividad comunitaria real",l:"Comunidad lafkenche",e:"Inmersión genuina, emoción y respeto profundo"},
        {h:"17:30",a:"Despedida y regreso a Concepción + álbum digital",l:"Concepción",e:"Reflexión, gratitud, recuerdo fotográfico"},
      ]}],
    },
    "2d": {
      nombre:"Territorio Lafkenche: Mar y Bosque",
      narrativa:"Dos días con el pueblo lafkenche en su territorio. Desde las caletas donde extraen sus alimentos hasta el bosque donde practican su medicina. Un viaje que cambia la manera de ver el mundo.",
      climax:"Amanecer en la costa sagrada lafkenche con guía espiritual de la comunidad",
      precio:"$140.000 – $185.000 CLP / persona",
      wow:"Tejido artesanal hecho en el viaje + carta de la familia anfitriona",
      dias:[
        { titulo:"Día 1 — Llegada y primer encuentro", ep:[
          {h:"10:00",a:"Traslado a la costa de Arauco",l:"Ruta costera Biobío",e:"Paisaje dramático, transición ciudad-costa"},
          {h:"12:00",a:"Almuerzo en caleta artesanal lafkenche",l:"Caleta costera Arauco",e:"Primer sabor auténtico del territorio"},
          {h:"14:00",a:"Recorrido costero con guía lafkenche",l:"Costa de Arauco",e:"Conocimiento ancestral del ecosistema marino"},
          {h:"20:00",a:"Cena y noche en familia lafkenche",l:"Hogar comunitario",e:"Intimidad, conexión humana, respeto profundo"},
        ]},
        { titulo:"Día 2 — Bosque medicinal y despedida ⭐ CLÍMAX", ep:[
          {h:"07:00",a:"🌅 CLÍMAX: Amanecer en la costa sagrada con guía espiritual",l:"Playa sagrada lafkenche",e:"Experiencia espiritual única, profundidad emocional máxima"},
          {h:"09:00",a:"Recorrido por el bosque medicinal lafkenche",l:"Bosque costero Arauco",e:"Conocimiento ancestral de la naturaleza"},
          {h:"11:00",a:"Taller de tejido de cierre con artesana",l:"Comunidad",e:"Co-creación, objeto propio con historia"},
          {h:"13:30",a:"Almuerzo de despedida y ceremonia de agradecimiento",l:"Comunidad",e:"Reciprocidad, emoción, cierre ritual"},
          {h:"16:00",a:"Regreso + tejido artesanal + carta de la familia",l:"Concepción",e:"Souvenir con alma"},
        ]},
      ],
    },
  },
};
