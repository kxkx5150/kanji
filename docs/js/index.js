Q = [];
KANJI = EKANJI;
var optobj = {
    tts: false,
    ttsinput: false,
    sound: true,
    random: false,
    rm: false,
    mode: "hw",
    lang: "",
    vgcolor: false,
    hwrensyu: false
};
var MondaiIndex = -1;
var DB = null;
var request = indexedDB.open("answer-database", "1");
request.onupgradeneeded = db_onCreate;
request.onsuccess = function (e) {
    DB = this.result;
};

function zeroPadding(num) {
    return ("0000000000" + num).slice(-10);
}

function db_onCreate(e) {
    var db = this.result;
    if (db.objectStoreNames.contains("items")) {
        db.deleteObjectStore("items");
    }
    var store = db.createObjectStore("items", {
        keyPath: "index",
        autoIncrement: true
    });
}

function sendDB(level, str) {
    if (DB) {
        var trans = DB.transaction(["items"], "readwrite");
        var store = trans.objectStore("items");
        var rq = store.get(str);
        rq.onsuccess = function () {
            var result = this.result;
            var data = {
                level: level,
                str: str
            };
            if (!result) {
                var req = store.put(data);
            } else {
                var req = store.delete(str);
                req.onsuccess = function () {
                    var req2 = store.put(data);
                };
            }
        };
    }
}

function deleteDB(str) {
    var trans = DB.transaction(["items"], "readwrite");
    var store = trans.objectStore("items");
    var req = store.delete(str);
}

function deleteObjectStore(cb) {
    var trans = DB.transaction(["items"], "readwrite");
    var store = trans.objectStore("items");
    var request = store.clear();
    request.onsuccess = function (e) {
        if (cb) cb();
    }
}

function getItem(str) {
    var trans = DB.transaction(["items"], "readwrite");
    var store = trans.objectStore("items");
    var req = store.get(str);
    req.onsuccess = function () {
        var result = this.result;
    };
}

function getAllItems(callback) {
    if (DB) {
        var trans = DB.transaction(["items"], "readwrite");
        var store = trans.objectStore("items");
        var items = [];
        trans.oncomplete = function (evt) {
            callback(items);
        };
        var cursorRequest = store.openCursor();
        cursorRequest.onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                items.push(cursor.value);
                cursor.continue();
            }
        };
    } else {
        setTimeout(function () {
            getAllItems(callback)
        }, 200)
    }
}
var resizetimerid = null;
window.addEventListener("resize", resizeWindow, false);
window.addEventListener("orientationchange", resizeWindow, false);

function resizeWindow(e, loadflg) {
    clearTimeout(resizetimerid);
    resizetimerid = setTimeout(function () {
        var tcnt = document.getElementById('onstabbar');
        var sec = document.querySelector(".section-");
        var cont = document.getElementById('mondai_container');
        var kcont = document.getElementById('kotae_container');
        var icont = document.getElementById('kotae_input_container');
        var hcont = document.getElementById('kotae_hw_container');
        var wih = window.innerHeight;
        var wiw = window.innerWidth;
        var wh = wih - tcnt.clientHeight - sec.clientHeight;
        var ch = wh / 12;
        document.getElementById("main_container").style.width = wiw + "px";
        document.getElementById('helpcontainer').style.height = wih - 140 - tcnt.clientHeight + "px";
        cont.style.height = ch * 3 + "px";
        kcont.style.height = ch * 9 + "px";
        icont.style.height = ch * 9 + "px";
        hcont.style.height = ch * 9 - 36 + "px";
        if (loadflg) {}
    }, 50)
}
window.addEventListener("load", function (event) {
    var lcs = localStorage.getItem("__opt_ejkanji__")
    if (lcs) {
        optobj = JSON.parse(lcs);
        if (optobj.random) document.getElementById("random_checkbox").checked = true;
        document.getElementById("tts_checkbox").checked = optobj.tts;
        document.getElementById("sr_checkbox").checked = optobj.ttsinput;
        document.getElementById("sound_checkbox").checked = optobj.sound;
        if (optobj.rm) document.getElementById("rmanswer_checkbox").checked = true;
        if (optobj.vgcolor) document.getElementById("vgcolor_chkbox").checked = true;
        if (optobj.hwrensyu) {
            document.getElementById("hwrensyu_chkbox").checked = true;
            setHWRensyu(true)
        }
        if (optobj.lang) document.getElementById("Language_slct").value = optobj.lang;
    }
    if (optobj.mode === "input") {
        changeKotaeMode("input");
        document.getElementById("kotae_houhou").value = "input"
    } else if (optobj.mode === "hw") {
        changeKotaeMode("hw");
        document.getElementById("kotae_houhou").value = "hw"
    } else if (optobj.mode === "select") {
        changeKotaeMode();
        document.getElementById("kotae_houhou").value = "select"
    }
    resizeWindow(null, true);
    setTimeout(function () {
        window.cells = new Cells($(".cell"));
    }, 200)
    addEvent();
    createDialog();

    if (!optobj.lang){
        var hash = location.hash;
        if(hash === "#eng"){
            optobj.lang = "eng"
        }else if(hash === "#viet"){
            optobj.lang = "viet"
        }
    }

    if (optobj.lang === "viet") {
        KANJI = VKANJI
        Q = VKANJI;
    } else {
        KANJI = EKANJI
        Q = EKANJI;
    }
    lcs = localStorage.getItem("__level_ejkanji__")
    if (lcs) {
        changeLevel(null, lcs)
    } else {
        stat();
    }
}, false);

function stat() {
    MondaiIndex = -1;
    sortMondai();
    convertFormat();
    shuffle(Q, true);
    var callback = function () {
        setTimeout(function () {
            tsuginoMondai(false, true);
        }, 100);
        createList();
    };
    if (optobj.rm) {
        removeRightAnswers(callback);
    } else {
        callback();
    }
}

function setHWRensyu(flg) {
    var hwcont = document.getElementById("hw_container");
    var svg = document.getElementById("svg_container");
    if (flg) {
        hwcont.style.display = "block";
        svg.style.opacity = 0.2;
    } else {
        hwcont.style.display = "none";
        svg.style.opacity = 1;
    }
}

function createList() {
    var lstcont = document.getElementById("helpcontainer");
    lstcont.innerHTML = "";
    var df = document.createDocumentFragment();
    for (var i = 0; i < Q.length; i++) {
        var lttl = Q[i].j;
        var ldiv = document.createElement("div");
        df.appendChild(ldiv)
        ldiv.innerHTML = lttl;
        ldiv.addEventListener("click", clickListItem, true);
        ldiv.setAttribute("class", "list_item");
        ldiv.index = i;
    };
    lstcont.appendChild(df)
}

function searchList(value) {
    var flg = false;
    if (value == "") flg = true;
    var items = document.querySelectorAll(".list_item");
    for (var ii = 0, ll = items.length; ii < ll; ii++) {
        var ttl = items[ii].textContent;
        var pattern = new RegExp(value, "i");
        var match = pattern.exec(ttl);
        if ((match && (match.index > -1)) || flg) {
            items[ii].style.display = "block"
        } else {
            items[ii].style.display = "none"
        }
    }
}

function clickListItem(e) {
    e.stopPropagation();
    var that = e.currentTarget;
    that.style.background = "deeppink";
    setTimeout(function () {
        that.style.background = "";
        MondaiIndex = that.index - 1;
        tsuginoMondai();
        var hdiv = document.getElementById("helpdiv");
        hdiv.style.left = "-800px";
        setTimeout(function () {
            hdiv.style.display = "none";
        }, 300)
    }, 200)
}

function addEvent() {
    var items = document.querySelectorAll(".kotae_item");
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener("click", clickItem)
    };
    document.getElementById("list_img").addEventListener("click", function () {
        document.getElementById("search_input").value = "";
        searchList("")
        document.getElementById("helpdiv").style.display = "block";
        document.getElementById("helpcontainer").scrollTop = 0;
        setTimeout(function () {
            document.getElementById("helpdiv").style.left = 0;
        }, 10)
    });
    document.getElementById("setting_img").addEventListener("click", function () {
        document.getElementById("optdiv").style.display = "block";
        setTimeout(function () {
            document.getElementById("optdiv").style.left = 0;
        }, 10)
    });
    var items = document.querySelectorAll("label.opt_checkbox");
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener("click", function (e) {
            e.stopPropagation();
        }, true)
    };
    document.getElementById("random_checkbox").addEventListener("change", function () {
        optobj.random = this.checked;
        storeOptions();
        location.reload()
    });
    document.getElementById("rmanswer_checkbox").addEventListener("change", function () {
        optobj.rm = this.checked;
        storeOptions();
        deleteObjectStore();
    });
    document.getElementById("tts_checkbox").addEventListener("change", function () {
        optobj.tts = this.checked;
        storeOptions();
        location.reload()
    });
    document.getElementById("sr_checkbox").addEventListener("change", function () {
        optobj.ttsinput = this.checked;
        storeOptions();
        location.reload()
    });
    document.getElementById("sound_checkbox").addEventListener("change", function () {
        optobj.sound = this.checked;
        storeOptions();
    });
    document.getElementById("optdiv").addEventListener("click", function () {
        var that = this;
        this.style.left = "-800px";
        setTimeout(function () {
            that.style.display = "none";
        }, 300)
    }, false);
    document.getElementById("helpdiv").addEventListener("click", function () {
        var that = this;
        this.style.left = "-800px";
        setTimeout(function () {
            that.style.display = "none";
        }, 300)
    }, false);
    document.getElementById("tab1").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab2").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab3").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab4").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab5").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab6").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("tab7").addEventListener("change", function () {
        if (this.checked) {
            changeLevel(true, this.id);
        }
    });
    document.getElementById("kotae_houhou").addEventListener("click", function (e) {
        e.stopPropagation();
    });
    document.getElementById("kotae_houhou").addEventListener("change", function (e) {
        if (this.value === "input") {
            changeKotaeMode("input");
        } else if (this.value === "hw") {
            changeKotaeMode("hw");
        } else {
            changeKotaeMode();
        }
        stat();
    });
    document.getElementById("Language_slct").addEventListener("click", function (e) {
        e.stopPropagation();
    });
    document.getElementById("Language_slct").addEventListener("change", function (e) {
        optobj.lang = this.value;
        storeOptions();
        location.reload();
    });
    document.getElementById("kotae_input").addEventListener("keyup", function (e) {
        var val = this.value.replace(/^\s+|\s+$/g, "");
        checkKotaeInput(val)
    });
    document.getElementById("search_input").addEventListener("click", function (e) {
        e.stopPropagation();
    });
    document.getElementById("search_input").addEventListener("keyup", function (e) {
        var val = this.value.replace(/^\s+|\s+$/g, "");
        searchList(val)
    });
    document.getElementById("vgcolor_chkbox").addEventListener("change", function () {
        var scont = document.getElementById("svg_container");
        if (this.checked) {
            optobj.vgcolor = true;
        } else {
            optobj.vgcolor = false;
        }
        storeOptions();
        setColorSVG(scont)
    });
    document.getElementById("hwrensyu_chkbox").addEventListener("change", function () {
        if (this.checked) {
            optobj.hwrensyu = true;
            setHWRensyu(true)
        } else {
            optobj.hwrensyu = false;
            setHWRensyu(false)
        }
        storeOptions();
    });
    document.getElementById("keshigomu_lbl").addEventListener("click", function (e) {
        e.stopPropagation();
        window.cells.cells[0].clear();
        window.cells.cells[1].clear();
    }, true);
    document.getElementById("hw_kotae_kesu").addEventListener("click", function (e) {
        e.stopPropagation();
        window.cells.cells[0].clear();
        window.cells.cells[1].clear();
    }, true);
    document.getElementById("yomi_input").addEventListener("keyup", function (e) {
        var val = this.value.replace(/^\s+|\s+$/g, "");
        if (YOMIOBJ.check(val)) {
            if (optobj.sound) {
                playSound(BUFFER);
            }
            YOMIOBJ.seikai();
            this.value = "";
        }
    });
    document.getElementById("yomi_kotae_button").addEventListener("click", function (e) {
        var toi = YOMIOBJ.show();
        if (toi) {
            document.getElementById("yomi_input").value = toi.y;
        }
    }, true);
    var touchStartX;
    var touchStartY;
    var touchMoveX;
    var touchMoveY;
    var flg = false;
    window.addEventListener("touchstart", function (event) {
        var tabbr = document.querySelector(".tab-bar__item.active");
        var lbtxt = tabbr.getAttribute("label");
        touchStartX = event.touches[0].pageX;
        touchStartY = event.touches[0].pageY;
    }, false);
    window.addEventListener("touchmove", function (event) {
        touchMoveX = event.changedTouches[0].pageX;
        touchMoveY = event.changedTouches[0].pageY;
        flg = true;
    }, false);
    window.addEventListener("touchend", function (event) {
        var tabbr = document.querySelector(".tab-bar__item.active");
        var lbtxt = tabbr.getAttribute("label");
        if (!flg) return;
        var sflg = false,
            sflg2 = false;
        if (touchStartX > touchMoveX) {
            if (touchStartX > (touchMoveX + 80)) {
                var hcont = document.getElementById("helpdiv");
                var ocont = document.getElementById("optdiv");
                sflg = hideWrap(hcont, -500)
                sflg2 = hideWrap(ocont, -500)
                if (!sflg && !sflg2) tsuginoMondai(true, false, true);
            }
        } else if (touchStartX < touchMoveX) {
            if ((touchStartX + 80) < touchMoveX) {
                var hcont = document.getElementById("helpdiv");
                var ocont = document.getElementById("optdiv");
                sflg = hideWrap(hcont, 500)
                sflg2 = hideWrap(ocont, 500)
                if (!sflg && !sflg2) tsuginoMondai(false, false, true);
            }
        }
        flg = false;
    }, false);
    var tabs = document.querySelectorAll(".tab-bar__button")
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener("click", clickTab, false)
    };
    document.getElementById("label_prev").addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        tsuginoMondai(true, false, true);
    }, true);
    document.getElementById("label_next").addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        tsuginoMondai(false, false, true);
    }, true);
}

function clickTab(e) {
    resizeWindow();
}

function isKanji(c) { // c:判別したい文字
    var unicode = c.charCodeAt(0);
    if ((unicode >= 0x4e00 && unicode <= 0x9f62)) return true;
    return false;
}

function changeKotaeMode(val) {
    var kcont = document.getElementById('kotae_container');
    var icont = document.getElementById('kotae_input_container');
    var hcont = document.getElementById('kotae_hw_container');
    if (val === "input") {
        kcont.style.display = "none";
        hcont.style.display = "none";
        icont.style.display = "block";
        optobj.mode = "input";
    } else if (val === "hw") {
        icont.style.display = "none";
        kcont.style.display = "none";
        hcont.style.display = "block";
        optobj.mode = "hw";
    } else {
        icont.style.display = "none";
        hcont.style.display = "none";
        kcont.style.display = "block";
        optobj.mode = "select";
    }
    storeOptions();
}

function checkKotaeInput(val) {
    if (!val) return;
    var mondai = Q[MondaiIndex];
    var kotae = checkOnaziKotae(val, mondai);
    if (kotae) {
        checkKotae(kotae, true, true)
    }
}

function checkOnaziKotae(val, mondai) {
    var kotae = "";
    if (mondai.k == val) {
        kotae = mondai.RightAns;
    }
    return kotae
}

function changeLevel(e, id) {
    if (!e) {
        document.getElementById(id).checked = true;
    }
    stat();
    localStorage.setItem("__level_ejkanji__", id);
}

function removeRightAnswers(callback) {
    var mcb = function (items) {
        (function (items) {
            var level = document.querySelector('input[name="tab"]:checked').value;
            var cary = Q.concat();
            var cb = function () {
                if (callback) callback();
            };
            for (var i = 0; i < items.length; i++) {
                for (var ii = 0; ii < Q.length; ii++) {
                    if (items[i].str == Q[ii].title && items[i].level == "ejkanji" + level) {
                        Q.splice(ii, 1)
                    }
                };
            };
            if (Q.length === 0) {
                Q = cary;
                deleteObjectStore(cb);
                showDialog("一周しました<br>全問を表示します。")
            } else {
                cb();
            }
        })(items);
    };
    getAllItems(mcb);
}

function createDialog() {
    var dialog = document.createElement("dialog")
    document.body.appendChild(dialog);
    dialog.setAttribute("id", "info_dialog");
    var h3 = document.createElement("h3")
    dialog.appendChild(h3);
    dialog.addEventListener("click", function (e) {
        dialog.close();
        if (dialog.firstChild.textContent.indexOf("間違い　") > -1) {
            dialog.firstChild.textContent = "";
            location.reload();
        }
    });
    return dialog;
}

function showDialog(txt) {
    var dialog = document.getElementById("info_dialog");
    dialog.firstChild.innerHTML = txt;
    dialog.show();
}

function setInfoLabel() {
    document.getElementById("info_label").textContent = MondaiIndex + 1 + " / " + Q.length;
    document.getElementById("info_label2").textContent = MondaiIndex + 1 + " / " + Q.length;
    document.getElementById("info_label3").textContent = MondaiIndex + 1 + " / " + Q.length;
}

function hideWrap(elem, mv) {
    if (elem.style.display == "block") {
        elem.style.left = mv + "px";
        setTimeout(function () {
            elem.style.display = "none";
        }, 300)
        return true;
    }
    return false;
}

function storeOptions() {
    localStorage.setItem("__opt_ejkanji__", JSON.stringify(optobj))
}

function tsuginoMondai(pre, loadflg, mvflg) {
    var func = function () {
        window.scrollTo(window.innerWidth + 100, 0);
        showMondai();
        if (optobj.tts) {}
        setInfoLabel();
        setTimeout(function () {
            if (optobj.mode == "input") {
                document.getElementById("kotae_input").focus();
            }
        }, 20)
    };
    if (pre) {
        MondaiIndex--;
        if (MondaiIndex < 0) {
            MondaiIndex = 0;
            return;
        }
        if (mvflg) {
            moveMainContainer(window.innerWidth * -1, func)
        }
    } else {
        MondaiIndex++;
        if (Q.length === MondaiIndex) {
            MondaiIndex--;
            checkMatigai();
            return;
        }
        if (loadflg) {
            func();
        } else if (mvflg) {
            moveMainContainer(window.innerWidth, func)
        } else {
            var cont = document.getElementById("main_container");
            cont.style.opacity = 0;
            setTimeout(function () {
                cont.style.display = "none";
                setTimeout(function () {
                    setTimeout(function () {
                        cont.style.display = "block";
                        setTimeout(function () {
                            cont.style.opacity = 1;
                            func();
                        }, 10)
                    }, 10)
                }, 10)
            }, 300)
        }
    }
}

function moveMainContainer(mvval, func) {
    var cont = document.getElementById("main_container");
    cont.style.left = mvval + "px";
    cont.style.opacity = 0;
    setTimeout(function () {
        cont.style.display = "none";
        setTimeout(function () {
            cont.style.left = 0;
            setTimeout(function () {
                cont.style.display = "block";
                setTimeout(function () {
                    cont.style.opacity = 1;
                    func();
                }, 10)
            }, 10)
        }, 10)
    }, 400)
}

function showMondai() {
    var txt = Q[MondaiIndex].Quest;
    txt = txt.replace(/(\r\n|\n|\r)/g, "<br>");
    document.getElementById("mondai_container").innerHTML = txt;
    var k1 = document.getElementById("kotae1");
    var k2 = document.getElementById("kotae2");
    var k3 = document.getElementById("kotae3");
    var k4 = document.getElementById("kotae4");
    k1.innerHTML = "<span class='toi_jyomi'>" + Q[MondaiIndex].Ans[0].replace(/\,/g, ",\u00a0") + "</span><span class='toi_vyomi'>" + Q[MondaiIndex].V[0] + "</span>" + "</span><span class='toi_vimi'>" + Q[MondaiIndex].VI[0] + "</span>";
    k2.innerHTML = "<span class='toi_jyomi'>" + Q[MondaiIndex].Ans[1] + "</span><span class='toi_vyomi'>" + Q[MondaiIndex].V[1] + "</span>" + "</span><span class='toi_vimi'>" + Q[MondaiIndex].VI[1] + "</span>";
    k3.innerHTML = "<span class='toi_jyomi'>" + Q[MondaiIndex].Ans[2] + "</span><span class='toi_vyomi'>" + Q[MondaiIndex].V[2] + "</span>" + "</span><span class='toi_vimi'>" + Q[MondaiIndex].VI[2] + "</span>";
    k4.innerHTML = "<span class='toi_jyomi'>" + Q[MondaiIndex].Ans[3] + "</span><span class='toi_vyomi'>" + Q[MondaiIndex].V[3] + "</span>" + "</span><span class='toi_vimi'>" + Q[MondaiIndex].VI[3] + "</span>";
    k1.setAttribute("data-txt", Q[MondaiIndex].Ans[0])
    k2.setAttribute("data-txt", Q[MondaiIndex].Ans[1])
    k3.setAttribute("data-txt", Q[MondaiIndex].Ans[2])
    k4.setAttribute("data-txt", Q[MondaiIndex].Ans[3])
    createKaisetsu(Q[MondaiIndex]);
    createReibun(Q[MondaiIndex]);
}

function createKaisetsu(mondai) {
    loadSVG(mondai.u.toLowerCase());
    loadREI(mondai.k);
    clearYOMI();
    loadYOMI(mondai.k);
}

function loadSVG(ucode) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "kanjivg/0" + ucode + ".svg", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var restxt = xhr.responseText;
                var scont = document.getElementById("svg_container");
                setColorSVG(scont, restxt);
            }
        }
    };
    xhr.send(null);
}

function loadREI(kanji) {
    var url = "rei/erei/" + kanji + ".txt";
    if (optobj.lang === "eng") {
        url = "rei/erei/" + kanji + ".txt";
    } else if (optobj.lang === "viet") {
        url = "rei/vrei/" + kanji + ".txt";
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var restxt = xhr.responseText;
                parseREI(restxt)
            }
        }
    };
    xhr.send(null);
}

function parseREI(restxt) {
    var html = "";
    var cont = document.getElementById("reibun_container2");
    cont.scrollTop = 0;
    var strs = restxt.split("\n");
    for (var i = 0; i < strs.length; i++) {
        var item = strs[i];
        if (item === "kunyomi") {
            html += "<div class='kunyomi_label'></div>"
        } else if (item === "onyomi") {
            html += "<div class='onyomi_label'></div>"
        } else if (item === "fumeiyomi") {
            html += "<div class='onyomi_label'></div>"
        } else if (item) {
            var tg = item.split("###");
            for (var j = 0; j < tg.length; j++) {
                var itemj = tg[j];
                if (!itemj) continue;
                if (j === 0) {
                    html += "<span class='rei_kanji'>" + itemj + "</span>";
                } else if (j === 1) {
                    html += "<span class='rei_yomi'>" + itemj + "</span>";
                } else if (j === 2) {
                    if (!optobj.lang) {
                        html += "<span class='rei_imi'></span>";
                    } else {
                        html += "<span class='rei_imi'>" + itemj + "</span>";
                    }
                }
            };
            html += "<br>"
        }
    };
    cont.innerHTML = html;
}
var YOMIOBJ = {
    index: -1,
    ary: [],
    check: function (val) {
        if (val === this.ary[this.index].y) {
            return true;
        }
        return false;
    },
    seikai: function () {
        if (this.ary.length < 1) {
            this.clear();
            return;
        }
        this.index++
            if (!this.ary[this.index]) {
                this.index = 0;
            }
        showYOMI();
    },
    set: function (ary) {
        this.index = 0;
        this.ary = ary;
    },
    show: function () {
        var toi = this.ary[this.index];
        if (toi) {
            return toi;
        } else {
            return null;
        }
    },
    clear: function () {
        this.index = -1;
        this.ary = [];
    }
};

function loadYOMI(kanji) {
    var url = "rei/erei/" + kanji + ".txt";
    if (optobj.lang === "eng") {
        url = "rei/erei/" + kanji + ".txt";
    } else if (optobj.lang === "viet") {
        url = "rei/vrei/" + kanji + ".txt";
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var restxt = xhr.responseText;
                parseYOMI(restxt)
            } else {
                clearYOMI();
            }
        }
    };
    xhr.send(null);
}

function parseYOMI(restxt) {
    var strs = restxt.split("\n");
    var reiary = [];
    for (var i = 0; i < strs.length; i++) {
        var item = strs[i];
        if (item === "kunyomi") {} else if (item === "onyomi") {} else if (item === "fumeiyomi") {} else if (item) {
            var tg = item.split("###");
            for (var j = 0; j < tg.length; j++) {
                var itemj = tg[j];
                if (!itemj) continue;
                if (j === 0) {
                    var reiobj = {};
                    reiobj.t = itemj;
                    reiobj.html = "<span class='yomi_kanji'>" + itemj + "</span>";
                } else if (j === 1) {
                    reiobj.y = itemj;
                } else if (j === 2) {
                    reiobj.i = itemj;
                    if (!optobj.lang) {
                        reiobj.html += "<span class='yomi_imi'></span>";
                    } else {
                        reiobj.html += "<span class='yomi_imi'>" + itemj + "</span>";
                    }
                    reiary.push(reiobj)
                }
            };
        }
    };
    if (reiary.length > 0) {
        loadYomiMondai(reiary);
        YOMIOBJ.set(reiary);
        showYOMI();
    } else {
        clearYOMI();
    }
}

function loadYomiMondai(reiary) {
    var lcont = document.getElementById("yomi_list_container");
    var df = document.createDocumentFragment();
    var inf = document.createElement("div");
    inf.appendChild(document.createTextNode("List"));
    inf.style.color = "deeppink";
    inf.style.marginBottom = "12px";
    lcont.appendChild(inf);
    for (var i = 0; i < reiary.length; i++) {
        var item = reiary[i];
        var div = document.createElement("div")
        div.appendChild(document.createTextNode(item.t));
        df.appendChild(div)
    };
    lcont.appendChild(df)
}

function setYOMI(reiary, idx) {
    YOMIOBJ.ary = reiary;
    YOMIOBJ.index = 0;
}

function showYOMI() {
    var toi = YOMIOBJ.show();
    if (toi) {
        var cont = document.getElementById("yomi_mondai_container");
        cont.innerHTML = toi.html;
    } else {
        clearYOMI();
    }
}

function clearYOMI() {
    document.getElementById("yomi_list_container").innerHTML = "";
    document.getElementById("yomi_mondai_container").innerHTML = "";
    document.getElementById("yomi_input").value = "";
    YOMIOBJ.clear();
}

function setColorSVG(scont, restxt) {
    if (restxt) {
        scont.innerHTML = restxt;
    }
    var svg = scont.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    var pss = svg.querySelectorAll("path");
    for (var i = 0; i < pss.length; i++) {
        var item = pss[i];
        if (!optobj.vgcolor) {
            item.setAttribute("stroke", "black")
        } else {
            if (i === 0) {
                item.setAttribute("stroke", "blue")
            } else if (i === 1) {
                item.setAttribute("stroke", "deeppink")
            } else if (i === 2) {
                item.setAttribute("stroke", "DarkViolet")
            } else if (i === 3) {
                item.setAttribute("stroke", "darkslategray")
            } else if (i === 4) {
                item.setAttribute("stroke", "peru")
            } else if (i === 5) {
                item.setAttribute("stroke", "midnightblue")
            } else if (i === 6) {
                item.setAttribute("stroke", "orangered")
            } else if (i === 7) {
                item.setAttribute("stroke", "fuchsia")
            } else if (i === 8) {
                item.setAttribute("stroke", "cornflowerblue")
            } else if (i === 9) {
                item.setAttribute("stroke", "mediumaquamarine")
            } else if (i === 10) {
                item.setAttribute("stroke", "green")
            } else if (i === 11) {
                item.setAttribute("stroke", "coral")
            } else if (i === 12) {
                item.setAttribute("stroke", "darkcyan")
            } else if (i === 13) {
                item.setAttribute("stroke", "dodgerblue")
            } else if (i === 14) {
                item.setAttribute("stroke", "violet")
            } else if (i === 15) {
                item.setAttribute("stroke", "goldenrod")
            } else if (i === 16) {
                item.setAttribute("stroke", "mediumaquamarine")
            } else if (i === 17) {
                item.setAttribute("stroke", "maroon")
            } else if (i === 18) {
                item.setAttribute("stroke", "darkturquoise")
            } else if (i === 19) {
                item.setAttribute("stroke", "darkolivegreen")
            } else if (i === 20) {
                item.setAttribute("stroke", "firebrick")
            } else if (i === 21) {
                item.setAttribute("stroke", "deepskyblue")
            } else if (i === 22) {
                item.setAttribute("stroke", "burlywood")
            } else if (i === 23) {
                item.setAttribute("stroke", "coral")
            } else if (i === 24) {
                item.setAttribute("stroke", "forestgreen")
            } else if (i === 25) {
                item.setAttribute("stroke", "mediumblue")
            } else if (i === 26) {
                item.setAttribute("stroke", "gold")
            } else if (i === 27) {
                item.setAttribute("stroke", "palevioletred")
            } else if (i === 28) {
                item.setAttribute("stroke", "darkorange")
            } else if (i === 29) {
                item.setAttribute("stroke", "purple")
            }
        }
    };
}

function createReibun(mondai) {
    var txts = mondai.rei;
    var html = "";
    var cnt = 0;
    if (txts) {
        var reis = txts.split("<");
        for (var i = 0; i < reis.length; i++) {
            if (!reis[i]) continue;
            var ts = reis[i].split(">");
            html += "<div class='reibun_item reibun_jp' style='color:deeppink'>" + ts[0] + "</div>";
            html += "<div class='reibun_item'>" + ts[1] + "</div>";
        };
    }
    var cont = document.getElementById("reibun_container");
    cont.scrollTop = 0;
    cont.innerHTML = html
    setTimeout(function () {
        cont.scrollTop = 0;
    }, 100)
}

function clickItem(e) {
    var span = this.querySelector(".kotae_span");
    var txt = span.getAttribute("data-txt");
    checkKotae(txt)
}

function checkKotae(txt, inptflg, fflg) {
    var flg = false;
    var mondai = Q[MondaiIndex];
    var audio = null;
    if (txt == mondai.RightAns || fflg) {
        if (optobj.sound) {
            audio = BUFFER;
        }
        flg = true;
        tsuginoMondai();
        if (!mondai.matigai) {
            var level = document.querySelector('input[name="tab"]:checked').value;
            sendDB("ejkanji" + level, mondai.title)
        }
        document.getElementById("kotae_input").value = "";
    } else {
        if (optobj.sound) {
            audio = EBUFFER;
        }
        if (inptflg) audio = null;
        mondai.matigai = true;
        if (true) showMatigai(mondai);
    }
    if (audio) {
        playSound(audio)
    }
    return flg;
}

function showMatigai(mondai) {
    return;
    document.getElementById("helpdiv").style.display = "block";
    setTimeout(function () {
        document.getElementById("helpdiv").style.left = 0;
    }, 10)
    document.getElementById("helpcontainer").innerHTML = mondai.comment;
}

function checkMatigai() {
    var cnt = 0;
    for (var i = 0; i < Q.length; i++) {
        if (Q[i].matigai) cnt++;
    };
    showDialog("間違い　" + cnt + "個")
}

function sortMondai() {
    var level = document.querySelector('input[name="tab"]:checked').value;
    var GS = [],
        G6 = [],
        G5 = [],
        G4 = [],
        G3 = [],
        G2 = [],
        G1 = [];
    for (var i = 0; i < KANJI.length; i++) {
        var item = KANJI[i];
        if (item.g === "7") {
            GS.push(item);
        } else if (item.g === "6") {
            G6.push(item);
        } else if (item.g === "5") {
            G5.push(item);
        } else if (item.g === "4") {
            G4.push(item);
        } else if (item.g === "3") {
            G3.push(item);
        } else if (item.g === "2") {
            G2.push(item);
        } else if (item.g === "1") {
            G1.push(item);
        }
    };
    if (level === "gs") {
        Q = GS;
    } else if (level === "g6") {
        Q = G6;
    } else if (level === "g5") {
        Q = G5;
    } else if (level === "g4") {
        Q = G4;
    } else if (level === "g3") {
        Q = G3;
    } else if (level === "g2") {
        Q = G2;
    } else if (level === "g1") {
        Q = G1;
    }
}

function convertFormat() {
    var cnt = 0,
        rndn = 0,
        rndns = [];
    for (var i = 0; i < Q.length; i++) {
        var item = Q[i];
        var mcont = document.getElementById("mondai_container");
        if (optobj.mode === "input" || optobj.mode === "hw") {
            if (item.v && item.vi && optobj.mode !== "hw") {
                if (!optobj.lang) {
                    var qtxt = "<span style='color:royalblue'></span>";
                } else {
                    var qtxt = "<span style='color:royalblue'>" + item.vi + "</span>";
                }
            } else {
                var vttxt = item.v;
                if (!vttxt) vttxt = item.vy
                if (!optobj.lang) {
                    var qtxt = item.y.replace(/\,/g, "\u00a0") + "\u00a0" + "<span style='color:royalblue'></span>";
                } else {
                    var qtxt = item.y.replace(/\,/g, ",\u00a0") + ",\u00a0" + "<span style='color:royalblue'>" + item.vi + "</span>";
                }
            }
            item.Quest = qtxt;
            mcont.style.fontSize = "15px";
            mcont.style.paddingTop = "42px";
        } else {
            item.Quest = item.k;
            mcont.style.fontSize = "";
            mcont.style.paddingTop = "";
        }
        item.comment = item.vi;
        item.Ans = [];
        item.VI = [];
        item.V = [];
        item.Ans[0] = item.y;
        item.VI[0] = item.vi;
        item.V[0] = item.v;
        item.j = item.k;
        item.rei = item.r;
        if (!item.title) {
            item.title = item.k + ":" + item.y;
        }
        while (cnt < 3) {
            rndn = rnd(Q.length - 1, 0);
            if (Q[rndn].y !== item.Ans[0] && (rndns.indexOf(rndn) === -1)) {
                item.Ans[cnt + 1] = Q[rndn].y;
                item.VI[cnt + 1] = Q[rndn].vi;
                item.V[cnt + 1] = Q[rndn].v;
                rndns.push(rndn)
                cnt++;
            }
        }
        cnt = 0;
        rndns = [];
    };

    function rnd(max, min) {
        var no = Math.floor((Math.random() * ((max + 1) - min)) + min);
        return no;
    }
}

function shuffle(a, ansflg, b, c) {
    var j, x, i, xx, xxx;
    for (i = a.length; i; i -= 1) {
        if (optobj.random || !ansflg) {
            j = Math.floor(Math.random() * i);
            x = a[i - 1];
            a[i - 1] = a[j];
            a[j] = x;
            if (b) {
                xx = b[i - 1];
                b[i - 1] = b[j];
                b[j] = xx;
            }
            if (c) {
                xxx = c[i - 1];
                c[i - 1] = c[j];
                c[j] = xxx;
            }
        }
        if (ansflg) a[i - 1].RightAns = a[i - 1].Ans[0] + "";
        if (a[i - 1].Ans) shuffle(a[i - 1].Ans, false, a[i - 1].VI, a[i - 1].V)
    }
}
