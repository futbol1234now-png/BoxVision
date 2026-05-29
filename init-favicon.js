(function(){
  // Genera favicon transparente: carga el logo PNG, elimina el fondo oscuro con
  // mix-blend-mode "screen" equivalente en canvas (cualquier pixel oscuro → transparente)
  function makeClearFavicon(){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function(){
      const size = 64;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      // Dibuja sobre fondo negro temporal para poder leer pixels reales
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size);
      const d = data.data;
      // Por cada pixel: si es oscuro (suma RGB < umbral) → transparente
      // Preserva pixeles claros/dorados (el ícono de la caja)
      for(let i = 0; i < d.length; i += 4){
        const r = d[i], g = d[i+1], b = d[i+2];
        // Oscuridad = inverso del máximo canal
        const brightness = Math.max(r, g, b);
        if(brightness < 80){
          // Pixel muy oscuro → completamente transparente
          d[i+3] = 0;
        } else if(brightness < 140){
          // Zona intermedia → semi-transparente (suaviza bordes)
          d[i+3] = Math.round((brightness - 80) / 60 * 255);
        }
        // Pixel claro → opaco (se mantiene)
      }
      ctx.putImageData(data, 0, 0);
      const favicon = document.getElementById("dynamicFavicon");
      if(favicon) favicon.href = c.toDataURL("image/png");
    };
    img.onerror = function(){ /* si falla, queda el favicon original */ };
    img.src = "icons/logo.png";
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", makeClearFavicon);
  } else {
    makeClearFavicon();
  }
})();