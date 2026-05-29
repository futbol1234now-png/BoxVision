/* BoxVision — Sistema de iconos inteligente (local + IA) */

// ── SISTEMA DE ICONOS INTELIGENTE ──────────────────────────────────────────
// getIcon: devuelve emoji inmediato (fallback local) mientras la IA responde
function getIcon(n, box){
  if(box && box.icon) return box.icon;
  return _getIconLocal(n) || "📦"; // 📦 es solo provisional, IA lo reemplazará
}

// Diccionario local masivo — respuesta instantánea sin red
// Si no matchea nada, devuelve null para que fetchSmartIcon tome el control
function _getIconLocal(n){
  n=(n||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); // sin tildes
  const m=[
    // ── MARCAS DEPORTIVAS / ZAPATILLAS ──
    [["adidas","nike","puma","reebok","under armour","fila","vans","converse","new balance","asics","skechers","hoka","brooks","salomon","mizuno","diadora","umbro","kappa","lotto","babolat"],"👟"],
    // ── MARCAS MODA / ROPA ──
    [["zara","h&m","shein","uniqlo","forever21","pull&bear","bershka","stradivarius","mango","gap","banana republic","old navy","primark","topshop","asos","ralph lauren","tommy hilfiger","lacoste","fred perry","polo","guess","calvin klein","armani","versace","gucci","prada","louis vuitton","chanel","dior","fendi","balenciaga","off white","supreme","palace","stone island","north face","columbia","patagonia","arc'teryx","berghaus"],"👗"],
    // ── ROPA GENERAL ──
    [["ropa","camisa","camiseta","polo","chompa","casaca","abrigo","chaqueta","vestido","falda","blusa","pantalon","jean","short","pijama","boxer","calzon","calcetines","medias","ropa interior","lenceria","sostén","brasier","bikini","traje","terno","corbata","camiseta","playera","buzo","sudadera","hoodie","sweatshirt","tank top","remera","franela","guayabera","poncho","poncho","capa","imperme","anorak","chaleco","cardigan","pullover","sweater","jersey","polo","uniforme","disfraz","traje de bano","bano","traje baño","ropa de cama"],"👕"],
    // ── ZAPATOS ──
    [["zapato","zapatilla","tenis","bota","sandalia","calzado","crocs","pantufla","mocasin","tacón","tacon","plataforma","escarpin","oxford","loafer","stiletto","ankle boot","slip on","chancla","flip flop","alpargata","abarca","zuecos","galocha"],"👟"],
    // ── ROPA DE CAMA / TEXTILES ──
    [["toalla","sabana","sabanas","frazada","almohada","cobertor","edredon","cojin","mantel","cortina","cubrecama","protector","colcha","quilt","manta","cobija","suavizante","ropa cama"],"🛏️"],
    // ── LIBROS / ESTUDIO ──
    [["libro","cuaderno","revista","comic","manga","novela","texto","biblia","enciclopedia","atlas","diccionario","agenda","libreta","apunte","tesis","carpeta","folder","fichero","separador","resaltador","lapicero","lapiz","boligrafo","pluma","regla","compas","escuadra","transportador","borrador","corrector","tijera","grapadora","perforadora","archivador"],"📚"],
    // ── JUGUETES / GAMING ──
    [["juguete","lego","muñeca","peluche","juego de mesa","funko","figura","hot wheels","barbie","playmobil","nerf","drone","rc","control remoto","rompecabezas","puzzle","ajedrez","monopoly","parchis","cartas","dado","trompo","yoyo","canica"],"🧸"],
    [["xbox","playstation","ps4","ps5","nintendo","switch","steam deck","videojuego","game","gaming","joystick","mando","headset gamer","silla gamer","mousepad","rgb"],"🎮"],
    // ── COCINA / UTENSILIOS ──
    [["olla","sarten","plato","vaso","taza","cubierto","cuchillo","tenedor","cuchara","bowl","tupper","licuadora","cafetera","microondas","batidora","freidora","tostadora","waffler","plancha cocina","arrocera","olla presion","colador","rallador","espumadera","espatula","molde","bandeja horno","wok","crepera","fondue","mandolina","pelador","abrelatas","sacacorchos","termometro cocina","bascula cocina"],"🍳"],
    [["cocina","kitchen","vajilla","menaje","ollas","utensilios de cocina"],"🍳"],
    // ── ELECTRODOMÉSTICOS ──
    [["refrigerador","nevera","lavadora","secadora","lavavajillas","aspiradora","plancha ropa","abanicos","ventilador","aire acondicionado","calefactor","humidificador","purificador","robot aspirador","roomba"],"🏠"],
    // ── TV / ENTRETENIMIENTO ──
    [["tv","television","televisor","monitor","proyector","pantalla","smart tv","oled","qled","beamer","receiver","decodificador","antena","chromecast","roku","fire stick","apple tv"],"📺"],
    // ── ELECTRÓNICA / TECH ──
    [["apple","iphone","ipad","macbook","imac","airpods","apple watch","mac mini"],"🍎"],
    [["samsung","galaxy","huawei","xiaomi","oppo","realme","oneplus","motorola","lg","sony xperia","google pixel","tecno","infinix"],"📱"],
    [["laptop","computadora","pc","desktop","computador","notebook","chromebook","ultrabook","workstation"],"💻"],
    [["cable","cargador","powerbank","bateria portatil","hub","adaptador","usb","hdmi","displayport","ethernet","router","modem","switch red","repeater","wifi"],"🔌"],
    [["auricular","audifonos","cascos","earbuds","airpods","headphones","parlante","bocina","subwoofer","soundbar","equipo de sonido","woofer"],"🎧"],
    [["camara","camara fotos","dslr","mirrorless","gopro","tripode","lente","objetivo","flash","estudio foto","dron","drone","gimbal"],"📷"],
    [["teclado","mouse","mousepad","webcam","microfono","estudio streaming","capturadora","disco duro","ssd","pendrive","memoria","ram","procesador","placa madre","tarjeta grafica","gpu","cpu","fuente poder","gabinete","impresora","escaner","tinta","cartucho"],"🖥️"],
    [["telefono","celular","smartwatch","wearable","reloj inteligente","pulsera actividad"],"📱"],
    // ── HERRAMIENTAS / CONSTRUCCIÓN ──
    [["martillo","destornillador","llave inglesa","taladro","clavo","tornillo","sierra","sierra circular","amoladora","esmeril","cortadora","pistola calor","nivel","metro","cinta metrica","alicate","pinza","tijera metal","soldadora","compresor","lijadora","router madera","fresadora","torno","soldadura"],"🔨"],
    [["pintura","pincel","brocha","rodillo","masilla","sellador","aguarras","lija","espátula pintura","compresor pintura","pistola pintura","cemento","mezcla","concreto","ladrillo","ceramica","porcelanato","pegamento ceramica","fragua","yeso","estuco","empaste","barniz","laca","impermeabilizante"],"🪣"],
    [["herramienta","taller","ferreteria","toolbox","caja herramientas"],"🔧"],
    // ── DEPORTES ──
    [["futbol","balon","pelota futbol","taco","guayo","canillera","arco","porteria","uniforme futbol"],"⚽"],
    [["basket","baloncesto","basketball","aro","canasta"],"🏀"],
    [["voley","volleyball","voleibol","red voley"],"🏐"],
    [["tenis","raqueta tenis","pelota tenis","padel","raqueta padel","bola padel","squash"],"🎾"],
    [["natacion","traje bano","gafas natacion","gorra natacion","tabla nadar","aleta","snorkel","surf","tabla surf","wetsuit","bodyboard"],"🏊"],
    [["bicicleta","ciclismo","casco bici","pedal","llanta bici","cadena bici","freno bici","cambio bici","maillot","culotte"],"🚴"],
    [["gym","gimnasio","pesa","mancuerna","barra","disco peso","kettlebell","banda elastica","cuerda saltar","pull up","protein","suplemento","creatina","whey"],"💪"],
    [["yoga","pilates","mat yoga","colchoneta","meditacion","bloque yoga","correa yoga"],"🧘"],
    [["boxeo","guante boxeo","saco boxeo","cuerda boxeo","protector bucal","vendas"],"🥊"],
    [["camping","carpa","tienda camping","saco dormir","colchoneta camping","linterna camping","mochila camping","brujula","navaja","hiking","trekking","baston","botas montana","cantimplora","hornillo camping"],"🏕️"],
    [["pesca","caña pesca","anzuelo","carrete","sedal","cebo","red pesca","bote","kayak","remo","paleta","chaleco salvavidas"],"🎣"],
    [["skate","skateboard","longboard","patines","patineta","casco patines","protecciones"],"🛹"],
    [["deporte","equipo deportivo","kit deportivo"],"⚽"],
    // ── DOCUMENTOS / OFICINA ──
    [["documento","papel","factura","contrato","carpeta documentos","archivo","titulo","certificado","pasaporte","visa","dni","escritura","poliza","seguro","contrato alquiler","escritura casa"],"📄"],
    [["oficina","escritorio","silla oficina","estante","librero","vitrina","archivador","impresora","escaner","papel impresora","toner","sello","perforadora","grapadora","clips","post-it"],"🖥️"],
    // ── MEDICAMENTOS / SALUD ──
    [["medicamento","medicina","pastilla","capsula","farmacia","botiquin","suero","vitamina","antibiotico","analgesico","antiinflamatorio","jarabe","pomada","crema medicinal","venda","gasa","esparadrapo","termometro","tensiometro","glucometro","nebulizador","muleta","silla ruedas","andadera"],"💊"],
    // ── BAÑO / CUIDADO PERSONAL ──
    [["shampoo","acondicionador","jabon","gel ducha","crema corporal","perfume","colonia","desodorante","maquillaje","base","labial","mascara","rimmel","sombra","delineador","bronceador","contorno","iluminador","esmalte unas","quitaesmalte","locion","serum","antiedad","bloqueador solar","protector solar","afeitadora","maquina afeitar","cuchilla","espuma afeitar","after shave","depiladora","cera depilar","cepillo dientes","pasta dientes","hilo dental","enjuague bucal","irrigador"],"🧴"],
    [["bano","toallero","set bano","accesorios bano","organizador bano","espejo bano"],"🚿"],
    // ── BEBÉ / NIÑOS ──
    [["bebe","nene","pañal","biberon","cuna","cochecito","carriola","silla bebe","bañera bebe","ropa bebe","mameluco","enterito","body bebe","chupete","sonajero","movil cuna","monitor bebe","andador bebe","corral","portabebe","mochila bebe","lactancia","extractor leche","leche formula","papa","papilla"],"🍼"],
    [["niño","juguete niño","mochila escolar","lonchera","escolar","colegio","uniforme colegio","guarderia","jardin ninos","pre kinder"],"🎒"],
    // ── MASCOTAS ──
    [["perro","gato","collar","correa","arena gato","alimento mascota","comida mascota","cama mascota","juguete mascota","jaula","acuario","peces","hamster","conejo","loro","canario","pajaro","veterinario","vacuna mascota","antiparasitario","shampoo mascota","cepillo mascota","ropa mascota","pañal mascota","snack mascota"],"🐾"],
    // ── JOYERÍA / ACCESORIOS ──
    [["joya","anillo","aretes","pulsera","collar joya","cadena","dije","medallion","broche","gemelo","prendedor","camafeo","sello anillo","alianza","compromiso","boda joya"],"💍"],
    [["reloj","smartwatch","correa reloj","caja reloj","fossil","casio","timex","citizen","seiko","orient","swatch","rolex","omega","tag heuer"],"⌚"],
    [["bolso","cartera","mochila","maleta","bolsa","maletin","riñonera","portafolio","clutch","tote bag","mochila viaje","trolley","maleta cabina","valija"],"👜"],
    [["sombrero","gorro","gorra","beanie","boina","sombrero panama","fedora","bucket hat","snapback","visera"],"🧢"],
    [["gafas","lentes","anteojos","gafas sol","lentes sol","monturas","estuche gafas"],"👓"],
    [["guante","bufanda","pañuelo","cinturon","tirantes","corbata","pajarita","pañuelo cuello"],"🧣"],
    // ── ALIMENTOS / COCINA ──
    [["arroz","fideos","pasta","macarrones","tallarines","quinua","cebada","avena","maiz","harina","azucar","sal","aceite","vinagre","salsa","condimento","especias","pimienta","comino","paprika","oregano","aji","rocoto"],"🌾"],
    [["enlatado","conserva","atun","sardina","spam","lata","frijol enlatado","garbanzos lata","tomate lata"],"🥫"],
    [["cafe","te","infusion","chocolate","cacao","leche","leche polvo","formula","mate","yerba"],"☕"],
    [["vino","cerveza","licor","whisky","ron","vodka","pisco","tequila","champagne","botella","bebida","alcohol"],"🍷"],
    [["aceite oliva","aceite vegetal","mantequilla","margarina","queso","yogurt","leche condensada"],"🧈"],
    [["fruta","verdura","vegetal","legumbre","semilla","nuez","almendra","mani","granola","cereal"],"🥦"],
    [["snack","galleta","chocolate","golosina","dulce","caramelo","chicle","chupete","paleta","torta","queque","bizcocho","pan"],"🍫"],
    [["comida","alimento","despensa","víveres","provisiones","mercado"],"🍽️"],
    // ── LIMPIEZA / HOGAR ──
    [["escoba","trapeador","mopa","fregona","recogedor","balde","cubeta","guante limpieza","esponja","estropajo","detergente","lavavajillas","suavizante","lejia","cloro","desinfectante","ambientador","insecticida","raticida","trampa"],"🧹"],
    [["papel higienico","papel toalla","servilleta","bolsa basura","film transparente","papel aluminio","papel hornear"],"🧻"],
    // ── MUEBLES / HOGAR ──
    [["sofa","sofa cama","sillon","silla comedor","silla","taburete","banco","reposapiés","puff","futon","hamaca","mecedora"],"🛋️"],
    [["cama","cabecero","somier","colchon","colchoneta","cama nido","litera","canapé"],"🛏️"],
    [["mesa","mesa comedor","mesa centro","escritorio","mesa noche","consola","aparador","vitrina","estanteria","librero","modulo","armario","ropero","closet","guardarropa","comoda","cajonera","buro","tocador","perchero","zapatero"],"🪑"],
    [["lampara","foco","bombilla","led","halogeno","aplique","pie lampara","lampara techo","colgante","araña luz","foco led","tira led","neon","veladora"],"💡"],
    [["cuadro","espejo","reloj pared","portaretrato","vela","difusor","aromaterapia","mueble","decoracion","adorno","figura decorativa","maceta decorativa","cactus","suculenta","terrario","bonsai"],"🖼️"],
    [["alfombra","tapete","felpudo","moqueta","runner","tapiz"],"🏠"],
    [["cocina mueble","modulo cocina","alacena","despensero","campana extractora","horno","encimera","fregadero"],"🍳"],
    // ── JARDÍN / EXTERIOR ──
    [["jardin","planta","maceta","tierra","semilla","abono","fertilizante","pala","rastrillo","tijera podar","manguera","aspersor","fumigadora","guante jardin","carretilla","compostaje","mantillo"],"🌱"],
    [["barbacoa","parrilla","grill","asador","carbon","leña","encendedor","brocheta","pinza asado"],"🔥"],
    [["piscina","inflable","flotador","red piscina","cloro piscina","bomba piscina","manguera piscina"],"🏊"],
    // ── VEHÍCULOS / TRANSPORTE ──
    [["auto","carro","coche","vehiculo","repuesto auto","aceite motor","filtro","llanta","neumatico","rueda","rim","aro","bateria auto","herramienta auto","kit emergencia","gato hidraulico","extintor"],"🚗"],
    [["moto","motocicleta","casco moto","guante moto","chaqueta moto","bota moto","repuesto moto"],"🏍️"],
    [["bicicleta","bike","ciclismo","casco bici","candado bici","luz bici","bolsa bici","portabici"],"🚲"],
    [["viaje","turismo","equipaje","maleta viaje","neceser","bolsa viaje","adaptador electrico","seguro viaje"],"✈️"],
    // ── ARTE / MANUALIDADES ──
    [["pintura artistica","acuarela","oleo","acrilico","lienzo","caballete","paleta","pincel arte","pastel","carboncillo","lapiz color","marcador","rotulador","tinta china","gouache","barniz arte"],"🎨"],
    [["costura","tela","hilo","aguja","maquina coser","patron","cremallera","boton","cierre","tijera costura","cinta metrica costura","dedal","almohadilla","bordado","ganchillo","tejido","lana","aguja tejer"],"🧵"],
    [["ceramica","arcilla","molde ceramica","torno ceramica","horno ceramica","esmalte ceramica","espátula ceramica"],"🏺"],
    [["madera","carpinteria","sierra madera","lijadora madera","barniz madera","cola","pegamento madera","tornillo madera","clavo madera"],"🪵"],
    [["scrapbook","manualidad","cartulina","foamy","silicona caliente","pistola silicona","stickers","washi tape","troquel","sello decorativo","troqueladora"],"✂️"],
    // ── MÚSICA ──
    [["guitarra","bajo","ukulele","bandurria","charango","cuatro","mandolina","arpa"],"🎸"],
    [["piano","teclado musical","sintetizador","organo","acordeon"],"🎹"],
    [["bateria","percusion","caja ritmos","bongo","congas","timbales","pandero","tambor"],"🥁"],
    [["violin","viola","cello","violonchelo","contrabajo","arco instrumento"],"🎻"],
    [["trompeta","trombon","tuba","saxofon","clarinete","flauta","oboe","fagot"],"🎺"],
    [["microfono","estudio grabacion","interfaz audio","mezclador","dj","tornamesa","vinyl","disco vinilo","amplificador","pedal guitarra","afinador","metronomo"],"🎙️"],
    [["musica","instrumento musical","partituras","atril","audifono","audifonos"],"🎵"],
    // ── FOTOGRAFÍA / VIDEO ──
    [["foto","fotografia","album foto","portafolio foto","camara","tripode","lente foto","flash foto","estudio foto","fondo foto","paraguas foto","softbox","reflector"],"📸"],
    [["video","camara video","filmadora","gimbal","slider","toma de video","streaming","ring light","teleprompter"],"🎬"],
    // ── NAVIDAD / FIESTAS ──
    [["navidad","nochebuena","arbol navidad","adorno navidad","bola navidad","estrella navidad","santa","papa noel","reno navidad","elfo","pesebre","nacimiento","villancico"],"🎄"],
    [["halloween","bruja","calabaza","disfraz halloween","calavera","esqueleto","murcielago"],"🎃"],
    [["cumpleanos","birthday","piñata","globo","pastel","cake","vela cumpleanos","gorro fiesta","decoracion cumpleanos","banner","streamer"],"🎂"],
    [["boda","matrimonio","decoracion boda","arreglo floral","ramo","centro mesa","velo","corona novia","anillo boda","lista boda"],"💒"],
    [["regalo","obsequio","presente","envoltura","papel regalo","liston","cinta regalo","caja regalo"],"🎁"],
    [["fiesta","party","reunion","evento","decoracion fiesta"],"🎉"],
    // ── PAPELERÍA / OFICINA ──
    [["lapicero","boli","boligrafo","pluma","lapiz","portaminas","resaltador","marcador","plumón","corrector","tipex","borrador","goma"],"✏️"],
    [["cuaderno","libreta","agenda","diario","bloc","post-it","nota adhesiva"],"📓"],
    [["sello","tampón","almohadilla sello","tinta sello","sellos coleccion"],"🏷️"],
    // ── TECNOLOGÍA ESPECÍFICA ──
    [["impresora 3d","filamento","resina 3d","placa arduino","raspberry pi","electronica diy","soldador electronica","estano"],"⚙️"],
    [["dron","drone","fpv","helice drone","bateria drone","controlador drone"],"🚁"],
    [["realidad virtual","vr","oculus","meta quest","lentes vr","guante vr"],"🥽"],
    // ── HABITACIONES ──
    [["sala","living","salon","sala estar"],"🛋️"],
    [["dormitorio","cuarto","habitacion","recamara","alcoba"],"🛏️"],
    [["bano","aseo","sanitario","lavabo","wc"],"🚿"],
    [["cocina mueble","kitchen","comedor","dining"],"🍽️"],
    [["garage","garaje","taller mecanico","deposito","bodega","sotano","altillo"],"🏠"],
    [["terraza","balcon","patio","azotea","jardin exterior"],"🌿"],
    // ── PAPÁ / PERSONA ──
    [["papa","papi","padre","mama","mami","madre","abuelo","abuela","hijo","hija","hermano","hermana"],"👨‍👩‍👧‍👦"],
    // ── COLEGIO / ESCUELA ──
    [["colegio","escuela","universidad","facultad","carrera","estudio","tesis","proyecto escolar","materiales escolares","utiles","utiles escolares"],"🎓"],
    // ── FINANZAS / IMPORTANTES ──
    [["dinero","efectivo","billetes","monedas","caja fuerte","joyas importantes","documentos importantes","valores"],"💰"],
    // ── HOGAR GENERAL ──
    [["casa","hogar","home","living","mudanza","traslado"],"🏡"],
    // ── NOMBRES GENÉRICOS / CORTOS ──
    [["varios","misc","miscelaneous","variado","mixto","general","otros","cosas","extra"],"🗂️"],
    [["importante","urgente","prioritario","primero","vital"],"⭐"],
    [["fragil","vidrio","cristal","porcelana","ceramica fina","cuidado"],"🫧"],
    [["pesado","peso","grande","voluminoso"],"📦"],
    [["recuerdo","foto","album","memoria","souvenir","coleccion","antigüedad","vintage"],"🖼️"],
    [["navidad","decoracion","adorno","festivo","fiesta","cumpleanos"],"🎄"],
  ];
  for(const[k,e] of m){
    if(k.some(w=>n.includes(w.normalize("NFD").replace(/[\u0300-\u036f]/g,"")))) return e;
  }
  return null; // null = pedir a la IA
}

const _iconAICache = {};
// IDs de cajas donde ya intentamos y fallamos — no reintentar
const _iconFailed = new Set();
// IDs de cajas cuya petición de ícono IA ya está en curso — evita duplicados
const _iconPending = new Set();

async function fetchSmartIcon(box){
  const name = (box.name||"").trim();
  if(!name || box.icon) return;
  if(_iconFailed.has(box.id)) return; // ya intentamos, no reintentar
  if(_iconPending.has(box.id)) return; // petición en vuelo, ignorar duplicado

  // Si el diccionario local ya tiene respuesta, usarla directamente
  const localResult = _getIconLocal(name);
  if(localResult){
    box.icon = localResult;
    _applyIconToDOM(box);
    saveData();
    return;
  }

  // Cache en memoria (intentos anteriores en esta sesión)
  if(_iconAICache[name]){
    box.icon = _iconAICache[name];
    _applyIconToDOM(box);
    return;
  }

  // Marcar como en curso ANTES de cualquier await para bloquear duplicados
  _iconPending.add(box.id);

  // Sin red o sin worker configurado → usar 📦 y marcar como fallido para no reintentar
  // NOTA: La API de Anthropic no puede llamarse directamente desde el browser (bloqueo CORS).
  // Para usar IA de íconos necesitás un proxy/worker que agregue la API key server-side.
  // Por ahora se usa el diccionario local extendido.
  const BOX_IA_WORKER_CONFIGURED = typeof BOX_IA_WORKER !== 'undefined' && BOX_IA_WORKER && !BOX_IA_WORKER.includes('YOUR_WORKER');

  if(!BOX_IA_WORKER_CONFIGURED){
    // Sin worker: usar emoji genérico por primera letra/tipo
    const fallback = _getIconFallbackByLetter(name);
    _iconAICache[name] = fallback;
    box.icon = fallback;
    _applyIconToDOM(box);
    saveData();
    _iconPending.delete(box.id);
    return;
  }

  // Si hay worker configurado, intentar via worker (no directo a Anthropic)
  try{
    const res = await fetch(BOX_IA_WORKER+"/icon",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name })
    });
    if(!res.ok) throw new Error("worker "+res.status);
    const data = await res.json();
    const emoji = (data?.emoji||"").trim();
    if(emoji && [...emoji].length <= 4 && [...emoji].length >= 1){
      _iconAICache[name] = emoji;
      box.icon = emoji;
      _applyIconToDOM(box);
      saveData();
      _iconPending.delete(box.id);
      return;
    }
    throw new Error("emoji inválido");
  }catch(e){
    _iconFailed.add(box.id);
    // Usar fallback por letra
    const fallback = _getIconFallbackByLetter(name);
    _iconAICache[name] = fallback;
    box.icon = fallback;
    _applyIconToDOM(box);
    saveData();
    _iconPending.delete(box.id);
  }
}

// Fallback inteligente por primera letra / consonante del nombre
function _getIconFallbackByLetter(name){
  const n = (name||"").toLowerCase().trim();
  if(!n) return "📦";
  // Intentar que sea relevante: si empieza con número → 🔢
  if(/^\d/.test(n)) return "🔢";
  // Paleta de emojis variados para distribuir visualmente
  const palette = ["🟦","🟧","🟩","🟥","🟨","🟪","🔶","🔷","🔸","🔹","🏷️","📌","🗂️","📋","🗃️","📁","🧩","🎁","📦","🛍️"];
  // Usar el código del primer carácter para elegir un emoji consistente
  const idx = n.charCodeAt(0) % palette.length;
  return palette[idx];
}

// Aplica el nuevo emoji en todos los lugares del DOM donde aparece esta caja
function _applyIconToDOM(box){
  // Tarjeta en el grid principal
  const cardIcon = document.querySelector(`[data-box-id="${box.id}"] .bc-icon`);
  if(cardIcon) cardIcon.textContent = box.icon;
  // Pantalla de detalle (si está abierta)
  const dIcon = document.getElementById("dIcon");
  if(dIcon && typeof currentBoxId !== "undefined" && currentBoxId === box.id){
    dIcon.textContent = box.icon;
  }
  // Preview del formulario (si está abierto)
  const fIcon = document.getElementById("formPreviewIcon");
  if(fIcon) fIcon.textContent = box.icon;
}
