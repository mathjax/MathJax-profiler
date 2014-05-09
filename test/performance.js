MathJax.Hub.Queue(function () {
  
  var HTML = function (node,style,div) {
    if (!div) {div = OUTPUT}; if (!style) {style = {}}
    node = div.appendChild(document.createElement(node));
    for (var id in style) {if (style.hasOwnProperty(id)) {node.style[id] = style[id]}}
    return node;
  }
  var TEXT = function (text,div) {
    if (!div) {div = OUTPUT}
    return div.appendChild(document.createTextNode(text));
  }
  
  var BOX = function (color,size,offset,style,tip,text,div,nobr) {
    if (!style) {style = {}}
    if (tip) {
      div = HTML("span",{cursor:"default"},div);
      div.title = tip;
    }
    var node = HTML("span",{
      display:"inline-block", width:Math.max(1,size)+"px", height:"10px",
      marginLeft:offset+"px", marginBottom:"1px", verticalAlign:"-2px",
      backgroundColor:color
    },div);
    for (var id in style) {if (style.hasOwnProperty(id)) {node.style[id] = style[id]}}
    if (text) {TEXT(" "+text,div)}
    if (!nobr) {HTML("br")}
    return node;
  }
  
  var Handle = {
    f: function (event) {
      var time = event.c - event.s;
      var title = time; if (event.ready) {title += " (ready at "+(event.ready-event.s)+")"}
      var box = BOX("#4D4",time,event.s,{},title,event.n);
      if (event.S < 0) {box.parentNode.style.color = "#D00"}
    },
    j: function (event) {
      var time = event.c - event.s;
      var parts = ["load:"+(event.config - event.s),
                   "config:"+(event.require - event.config),
                   "require:"+(event.startup - event.require),
                   "startup:"+(event.ready - event.startup)].join(",");
      var box = BOX("#4D4",time,event.s,{},time+": ["+parts+"]",event.n);
      if (event.S < 0) {box.parentNode.style.color = "#D00"}
    },
    w: function (event) {
      var time = event.c - event.s;
      var box = BOX("#4DD",time,event.s,{},time,event.n);
      if (event.S < 0) {
        var span = document.createElement("span");
        span.style.color = "#D00";
        span.appendChild(box.parentNode.replaceChild(span,box.nextSibling));
      }
    },
    s: function (event) {
      var time = 1, start = event.t, color = "#00D";
      if ("s" in event) {start = event.s; time = event.e - start; color = "#F44"}
      BOX(color,time,start,{},time,event.n);
    },
    h: function (event) {
      var time = 1, start = event.t, color = "#00D";
      if ("s" in event) {start = event.s; time = event.e - start; color = "#FA4"}
      var title = time;
      if (event.v) {
        title += " ["+event.v+"]";
        if (event.bf) {title += " bold"}
        if (event.it) {title += " italic"}
      }
      var node = BOX(color,time,start,{},title,event.n);
      if (event.n === "Math Output") {MATH = node; MATHSTART = event.s, MATHn = 0}
    },
    m: function (event) {
      var time = event.e - event.s;
      BOX("#FFDD44",time,event.s,{},time,event.n);
    }
  };
  
  var OUTPUT = HTML("div",{
    border: "1px solid black",
    marginTop: "1em",
    padding :"3px",
    fontSize: "11px",
    whiteSpace: "nowrap"
  },document.body);
  
  var PROFILER = MathJax.Extension.Profiler;
  TEXT(PROFILER.URL,HTML("b",{fontSize:"120%"})); HTML("br");
  TEXT(PROFILER.userAgent); HTML("br");
  TEXT(PROFILER.browser); HTML("p");

  var EVENTS = PROFILER.events, MATH, MATHSTART, MATHn;
  for (var i = 0, m = EVENTS.length; i < m; i++) {(Handle[EVENTS[i].T])(EVENTS[i])}
})
