window.AudioContext = window.AudioContext || window.webkitAudioContext; 
var BUFFER = null; 
var EBUFFER = null;
var CONTEXT = new AudioContext();
var getAudioBuffer = function(url, flg) {  
  var req = new XMLHttpRequest();
  req.responseType = 'arraybuffer';
  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 0 || req.status === 200) {
        CONTEXT.decodeAudioData(req.response, function(buffer) {
            if(flg){
                EBUFFER = buffer;
            }else{
                BUFFER = buffer;
            }
        });
      }
    }
  };
  req.open('GET', url, true);
  req.send('');
};
getAudioBuffer('mp3/seikai.mp3');
getAudioBuffer('mp3/matigai.mp3',true);
var playSound = function(buffer) {
  var source = CONTEXT.createBufferSource();
  source.buffer = buffer;
  source.connect(CONTEXT.destination);
  source.start(0);
};
var Cells = function(a) {
    this.cells = [], a.each(function(a, b) {      
        $(b).hasClass("in") && this.cells.push(new Cell(this, $(b)))
    }.bind(this))
};
Cells.prototype = {
    set: function(a, b) {
        for (var c = 0; c < this.cells.length; c++) {
            var d = this.cells[c];
            d.num == a && d.set(b)
        }
    }
};
var Cell = function(a, b) {
    var cont = b;
    var ww = window.innerWidth;
    if(b[0].getAttribute("id") === "hw_container"){
        var tbbar = document.getElementById("onstabbar")
        var wh = window.innerHeight-tbbar.clientHeight-104;
    }else if(b[0].getAttribute("id") === "kotae_hw_container"){
        var tcnt = document.getElementById('onstabbar');    
        var sec = document.querySelector(".section-");
        var hcont = document.getElementById('kotae_hw_container');
        var wih = window.innerHeight;
        var cnth = wih-tcnt.clientHeight-sec.clientHeight;
        var ch = cnth/12;
        var wh = ch*9-36;
    }
	var str = '<canvas width="'+ww+'" height="'+wh+'">'
    this.cells = a, this.stroke = [], this.time = 0, this.timer = null, this.$cell = b, this.num = parseInt(b.find(".num").text()), this.$canvas = $(str).appendTo(b), this.$text = b.find(".txt"), this.$canvas.on("mousedown touchstart", this.touchStart.bind(this)), this.$canvas.on("blur", this.hide.bind(this))
};
Cell.prototype = {
    set: function(a) {
        this.$text.text(a)
    },
    hide: function() {
    },
    show: function(a,pid) {
        var mondai = Q[MondaiIndex];
        var that = this;
        var knj = "";
        for (var i = 0; i < a.length; i++) {
            if(isKanji(a[i])){
                knj = a[i];
                break;
            }
        };
        console.log(mondai.k)
        console.log(knj)
        if(!knj)return;
        if(pid === "kotae_hw_container"){
            if(knj === mondai.k){
                checkKotae(mondai.k,true,true)
            }else if(mondai.k === "右"&&knj === "古"){
                checkKotae(mondai.k,true,true)
            }else{
                checkKotae("a")
            }
            that.clear();
        }else{

            if(knj === mondai.k){
                var img = document.getElementById("yokudekimashita_img");
                var audio = BUFFER;
            }else if(mondai.k === "右"&&knj === "古"){
                var img = document.getElementById("yokudekimashita_img");
                var audio = BUFFER;
            }else{
                var img = document.getElementById("ganbarou_img");
                var audio = EBUFFER;
            }
            img.style.display = "inline";
            if(optobj.sound)playSound(audio)
            setTimeout(function(){
                img.style.display = "";
                that.clear();
            },1200)
        }
    },
    send: function(e) {
        var mondai = Q[MondaiIndex];
        if(this.stroke.length+"" !== mondai.s)return;

        var pnode = e.currentTarget.parentNode;
        var pid = pnode.getAttribute("id");        
        var chii = e.currentTarget.clientHeight;
        for (var a = {
                device: window.navigator.userAgent,
                input_type: 0,
                options: "enable_pre_space",
                requests: [{
                    writing_guide: {
                        writing_area_width: window.innerWidth,
                        writing_area_height: chii
                    },
                    pre_context: "",
                    max_num_results: 1,
                    max_completions: 0,
		    language: "ja",
                    ink: []
                }]
            }, b = [], c = 0; c < this.stroke.length; c++) {
            for (var d = this.stroke[c], e = [], f = [], g = [], h = 0; h < d.length; h++) e.push(d[h].x), f.push(d[h].y), g.push(d[h].t);
            b.push([e, f, g])
        }
        a.requests[0].ink = b, $.ajax({
            url: "https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=thaks_google",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(a),
            dataType: "json"
        }).done(function(a) {
            "SUCCESS" == a[0] && this.show(a[1][0][1],pid)
        }.bind(this))
    },
    clear: function() {
        var a = this.$canvas[0],
            b = a.getContext("2d");
        b.clearRect(0, 0, a.width, a.height), this.time = 0, this.stroke = [], this.cells.set(this.num, "")
    },
    touchStart: function(a) {
        this.hide(), window.clearTimeout(this.timer);
        var b = this.$canvas[0],
            c = b.width / this.$canvas.width(),
            d = b.height / this.$canvas.height(),
            e = b.getContext("2d");
        e.lineWidth = 4 * c, e.lineCap = "round", e.lineJoin = "round";
        var f = function(a) {
                return a.originalEvent.touches ? a.originalEvent.touches[0].pageX : a.pageX
            },
            g = function(a) {
                return a.originalEvent.touches ? a.originalEvent.touches[0].pageY : a.pageY
            },
            h = b.width,
            i = b.height,
            j = 0,
            k = 0,
            l = 0,
            m = 0,
            n = function(a) {
                a.x * c < h / 2 && j > -1 ? (j = -1, l++) : a.x * c > h / 2 && 1 > j && (j = 1, l++), a.y * d < i / 2 && k > -1 ? (k = -1, m++) : a.y * d > i / 2 && 1 > k && (k = 1, m++)
            },
            o = function(a) {
                var h = {
                    x: f(a) - $(b).offset().left,
                    y: g(a) - $(b).offset().top,
                    t: (new Date).getTime() - this.time
                };
                q.push(h), n(h), e.lineTo(h.x * c, h.y * d), e.stroke(), a.preventDefault(),a.stopPropagation()
            },
            p = function(a) {
                a.originalEvent.touches ? ($(b).unbind("touchmove"), $(b).unbind("touchend")) : ($(b).unbind("mousemove"), $(b).unbind("mouseup")), this.stroke.push(q), l > 6 || m > 6 ? window.setTimeout(this.clear.bind(this), 500) : (this.timer = window.setTimeout(this.send.bind(this,a), 500), a.preventDefault(),a.stopPropagation())
            };
        a.originalEvent.touches ? ($(b).bind("touchmove", o.bind(this)), $(b).bind("touchend", p.bind(this))) : ($(b).bind("mousemove", o.bind(this)), $(b).bind("mouseup", p.bind(this))), 0 == this.time && (this.time = (new Date).getTime());
        var q = [],
            r = {
                x: f(a) - $(b).offset().left,
                y: g(a) - $(b).offset().top,
                t: (new Date).getTime() - this.time
            };
        q.push(r), e.beginPath(), e.moveTo(r.x * c, r.y * d), a.preventDefault(),a.stopPropagation()
    }
};



