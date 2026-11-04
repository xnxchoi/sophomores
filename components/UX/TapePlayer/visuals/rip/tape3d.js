let Gl = !0, mf, ll, Fr, lr, Ii;
var Rl = new Ft;
new zr;
let Wl = !1
    , _a = !1
    , cl = !1;
const L0 = window.innerWidth
    , Rn = {
    width: L0,
    height: L0 / (16 / 9),
    pixelRatio: Math.min(window.devicePixelRatio, 2)
};

function zb(r) {
    const e = r.getBoundingClientRect();
    return e.bottom >= 0 && e.right >= 0 && e.top <= (window.innerHeight || document.documentElement.clientHeight) && e.left <= (window.innerWidth || document.documentElement.clientWidth)
}

document.addEventListener("visibilitychange", function () {
    Gl = !document.hidden
});
const Hb = new eb
    , ug = new Ub;
ug.setDecoderPath("https://raw.githubusercontent.com/kujira22/kujira_webgl/master/cw/draco/");
const lg = new DRACOLoader();
lg.setDRACOLoader(ug);

function Vb() {
    ll = document.querySelector("canvas.webgl"),
        lr = new cy;
    const r = window.innerWidth;
    let e = 16 / 9;
    r < 480 ? e = 9 / 16 : r <= 991 && (e = 1 / 1),
        Rn.width = r,
        Rn.height = Rn.width / e,
        Fr = new Pn(10, Rn.width / Rn.height, .1, 100),
        lr.add(Fr),
        Fr.position.set(-8, -3, 15),
        Fr.lookAt(0, 0, 0),
        lr.rotation.set(.1, 0, 0),
        mf = new H1(Fr, ll),
        mf.enableDamping = !0,
        Ii = new k1({
            canvas: ll,
            antialias: !0,
            alpha: !0
        }),
        Ii.shadowMap.type = v_,
        Ii.toneMapping = y_,
        Ii.toneMappingExposure = 1,
        Ii.setSize(Rn.width, Rn.height),
        Ii.setPixelRatio(Rn.pixelRatio),
        Ii.outputColorSpace = Gt;
    const t = new J_(16751401, 50, 3.5, 3.6);
    t.position.set(-2, -1.3, 2),
        lr.add(t);

    function n() {
        Ke.create({
            trigger: "#webgl_trigger",
            start: "top bottom-=20%",
            end: "bottom top+=0%",
            scrub: !0,
            markers: !1,
            animation: Ve.to(t.position, {
                x: 2,
                y: -.5,
                x: -.5,
                ease: "none",
                onUpdate: () => {
                    t.needsUpdate = !0
                }
            })
        })
    }

    n(),
        Hb.load("https://raw.githubusercontent.com/kujira22/kujira_webgl/master/SF24/ev/urban_alley_01_1k.hdr", i => {
                i.mapping = Tl,
                    lr.environment = i
            }
        )
}

const cg = {
    startRendering() {
        !Wl || _a || (Yb(),
            _a = !0,
            cl = !1,
            dg())
    },
    stopRendering() {
        _a && (_a = !1)
    }
};
let Gb = -.005, hg = 0, qc = 0, no;

function Wb(r) {
    const e = () => {
            const t = window.innerWidth;
            let n;
            t < 479 || t >= 479 && t < 991 ? n = .5 : n = .6,
                r.scale.set(n, n, n)
        }
    ;
    e(),
        window.addEventListener("resize", e)
}

function Xb() {
    lg.load("https://raw.githubusercontent.com/kujira22/kujira_webgl/master/SF24/models/SFmodel42.gltf", r => {
            const e = r.scene;
            if (e.receiveShadow = !0,
                e.castShadow = !0,
                e.position.set(0, 0, 0),
                lr.add(e),
                Wb(e),
                e.traverse(o => {
                        if (o.isMesh && o.material && o.material.name === "Display") {
                            const a = document.createElement("video");
                            a.src = "https://raw.githubusercontent.com/kujira22/kujira_webgl/master/SF24/video/Display.mp4",
                                a.crossOrigin = "anonymous",
                                a.loop = !0,
                                a.muted = !0,
                                a.playsInline = !0;
                            const u = new Sy(a);
                            u.minFilter = zt,
                                u.magFilter = zt,
                                u.format = ni,
                                u.flipY = !1,
                                o.material.emissive = new qe(9893887),
                                o.material.emissiveIntensity = 200,
                                o.material.emissiveMap = u,
                                o.material.needsUpdate = !0;
                            const l = document.querySelector("canvas.webgl");
                            l && setTimeout(() => {
                                    const c = new MouseEvent("click", {
                                        bubbles: !0,
                                        cancelable: !0,
                                        view: window
                                    });
                                    l.dispatchEvent(c),
                                        a.play().catch(h => {
                                            }
                                        )
                                }
                                , 2e3)
                        }
                    }
                ),
                e.traverse(o => {
                        if (o.isMesh && o.material && o.material.name === "black_glass") {
                            o.material;
                            const a = new Ai({
                                color: "#111111",
                                metalness: 0,
                                roughness: 0,
                                transmission: 1,
                                ior: 1.3,
                                thickness: .3,
                                transparent: !1,
                                envMap: lr.environment
                            });
                            o.material = a,
                                o.material.needsUpdate = !0
                        }
                    }
                ),
                e.traverse(o => {
                        if (o.isMesh && o.material && o.material.name === "Black") {
                            o.material;
                            const a = new qa({
                                color: "#1c1c1c",
                                metalness: 0,
                                roughness: 1
                            });
                            o.material = a,
                                o.material.needsUpdate = !0
                        }
                    }
                ),
                Rl = e.getObjectByName("Disk"),
                !Rl)
                return;
            Mi.on("scroll", ({velocity: o}) => {
                    s.isActive && (hg = -o * .005)
                }
            );
            const t = -.6;
            e.rotation.y = t;
            const n = -.2
                , i = .6
                , s = Ke.create({
                trigger: "#webgl_trigger",
                start: "top center+=50%",
                end: "bottom center-=50%",
                markers: !1,
                scrub: !0,
                onUpdate: o => {
                    if (e) {
                        const a = 2 * Math.PI / 6;
                        e.rotation.y = t + o.progress * a,
                            e.position.y = n + o.progress * i
                    }
                }
            });
            e.traverse(o => {
                    if (o.isMesh && o.material && o.material.name === "Metal") {
                        let l = function () {
                            Ke.create({
                                trigger: "#webgl_trigger",
                                start: "top bottom-=20%",
                                end: "bottom top+=0%",
                                scrub: !0,
                                markers: !1,
                                animation: Ve.to(no, {
                                    envMapIntensity: 3,
                                    ease: "none",
                                    onUpdate: () => {
                                        no.needsUpdate = !0
                                    }
                                })
                            })
                        };
                        var a = l;
                        const u = o.material;
                        no = new qa({
                            color: "#EBEFF4",
                            metalness: .85,
                            roughness: .2,
                            envMap: lr.environment,
                            envMapIntensity: .1,
                            normalMap: u.normalMap,
                            normalScale: u.normalScale
                        }),
                            o.material = no,
                            o.material.needsUpdate = !0,
                            no.normalScale.set(.5, .5),
                            no.needsUpdate = !0,
                            l()
                    }
                }
            )
        }
    )
}

window.addEventListener("resize", () => {
        const r = window.innerWidth;
        let e;
        r < 480 ? e = 9 / 16 : r <= 991 ? e = 1 / 1 : e = 16 / 9,
            Rn.width = r,
            Rn.height = r / e,
            Fr.aspect = Rn.width / Rn.height,
            Fr.updateProjectionMatrix(),
            Ii.setSize(Rn.width, Rn.height),
            Ii.setPixelRatio(Rn.pixelRatio)
    }
);
window.onfocus = function () {
    Gl = !0
}
;
window.onblur = function () {
    Gl = !1
}
;
let fg = !1;
setTimeout(() => {
        fg = !0
    }
    , 5e3);

function dg() {
    if (!_a || !Wl)
        return;
    window.requestAnimationFrame(dg);
    const r = zb(ll);
    if (!(fg && !Gl) && (!cl && r && (cl = !0),
        !(cl && !r))) {
        if (Rl) {
            qc += (hg - qc) * .1;
            const e = Gb + qc;
            Rl.rotation.y += e
        }
        mf.update(),
            Ii.render(lr, Fr)
    }
}