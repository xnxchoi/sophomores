import * as THREE from 'three'
import {useRef, useState} from 'react'
import {useIsMobile} from '@/utilities/getBreakpoints.ts'

function ScrollShader(target, elmtParent, l, f) {
	let rafTourne = !1
	let renderer = new THREE.WebGLRenderer({
		antialias: !0,
	})
	let st = null
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
	let dpr = Math.min(window.devicePixelRatio, 2)
	renderer.setSize(
		target.closest('.vignette').offsetWidth * dpr,
		target.closest('.vignette').offsetHeight * dpr,
	)
	let oldX = 0,
		y = 0,
		ampl = 1,
		elmt = target
	elmt.appendChild(renderer.domElement)
	let listMedias = target.querySelectorAll('img.media, .media video'),
		subset = f || [0, listMedias.length],
		listMesh = [],
		currentMesh = subset[0],
		progress = {}
	let offsetWidth = elmtParent.offsetWidth
	y = elmtParent.offsetWidth
	let w = y,
		_ = offsetWidth / y
	let camera = new THREE.Camera((w * _) / -2, (w * _) / 2, w / 2, w / -2, -1e3, 1e3)
	let textur = new THREE.TextureLoader()
	let scene = new THREE.Scene()
	var geom = new THREE.PlaneGeometry(offsetWidth, offsetWidth, 1, 1)
	listMedias.forEach(function () {
		let mater = new THREE.MeshPhysicalMaterial()
		if (target.tagName.toLowerCase() !== 'video') {
			let l = target.getAttribute('src')
			let d = textur.load(l)
			d.anisotropy = renderer.capabilities.getMaxAnisotropy()
			mater.map = d
		} else {
			let r = target
			fetch(r.src, {
				method: 'HEAD',
			}).then(function (e) {
				r.src = e.url
			})
			let o = new THREE.VideoTexture(r)
			o.minFilter = THREE.LinearFilter
			o.magFilter = THREE.LinearFilter
			o.format = THREE.RGBFormat
			o.anisotropy = renderer.capabilities.getMaxAnisotropy()
			mater.map = o
		}
		let m = new THREE.Mesh(geom, mater)
		listMesh.push(m)
	})
	
	scene.add(listMesh[subset[0]])
	let sceneP = new THREE.Scene(),
		dummyCameraP = new THREE.Camera()
	let C = new THREE.BufferGeometry(),
		O = new Float32Array([-1, -1, 3, -1, -1, 3])
	C.setAttribute('position', new THREE.BufferAttribute(O, 2))
	let x = new THREE.Vector2()
	renderer.getDrawingBufferSize(x)
	let targetP = new THREE.RenderTarget(x.x, x.y, {
		format: c.k,
		stencilBuffer: !1,
		depthBuffer: !0,
	})
	let materialP = new THREE.ShaderMaterial({
		vertexShader:
			'\n\t            precision highp float;\n\t            attribute vec2 position;\n\n\t            void main() {\n\t                gl_Position = vec4(position, 1.0, 1.0);\n\t            }\n\t        ',
		fragmentShader:
			'\n\t            precision highp float;\n\t            uniform sampler2D uScene;\n\t            uniform vec2 uResolution;\n\t            uniform float uTime;\n\t            uniform float uIntensite;\n\t            uniform float uIntensiteGrain;\n\t            uniform float uIntensiteVague;\n\n\t            //varying vec2 vPosition;\n\n\t            void main() {\n\t                vec2 uv = gl_FragCoord.xy / uResolution.xy;\n\t                vec3 color = vec3(uv, 1.0);\n\n\t                float strength = uIntensiteGrain;\n\n\t                float x = (uv.x + 4.0 ) * (uv.y + 4.0 ) * (1. * 10.0);\n\t                vec4 grain = vec4(mod((mod(x, 13.0) + 1.0) * (mod(x, 123.0) + 1.0), 0.01)-0.0005) * strength; // 0.005;\n\n\t                // test 1\n\t                // uv.x -= cos(uv.x*uIntensite)/50.0 * uIntensiteVague;\n\n\t          \t\t  // test 2\n\t                // uv.y += sin(uv.y*20.0)/20.0 * uIntensiteVague;\n\n\t                // test 3\n\t                // uv.x -= sin(uv.x*uIntensite/10.)/10.0 * uIntensiteVague*0.5;\n\n\t                // test 4\n\t                uv.x -= sin(uv.x*uIntensite/10. + uTime)/10.0 * uIntensiteVague*0.5;\n\n\t                color = texture2D(uScene, uv).rgb;\n\n\t                gl_FragColor = vec4(color, 1.0) + grain;\n\t            }\n\t        ',
		uniforms: {
			uScene: {
				value: targetP.texture,
			},
			uResolution: {
				value: x,
			},
			uIntensite: {
				value: 150,
			},
			uIntensiteGrain: {
				value: 0,
			},
			uIntensiteVague: {
				value: 5,
			},
			uTime: {
				value: 0,
			},
		},
	})
	let inten = gsap.quickSetter(materialP.uniforms.uIntensite, 'value')
	let intenV = gsap.quickSetter(materialP.uniforms.uIntensiteVague, 'value')
	let L = new THREE.Mesh(C, materialP)
	;(L.frustumCulled = !1), sceneP.add(L)
	
	const onEnter = function () {
		playVideoMesh(), gsap.ticker.add(raf)
	}
	const onLeave = function () {
		gsap.ticker.remove(raf), pauseVideoMesh()
	}
	const updateTrail = function () {
		pauseVideoMesh(),
			scene.remove(listMesh[currentMesh]),
			currentMesh + 1 < subset[1] ? currentMesh++ : (currentMesh = subset[0]),
			playVideoMesh(),
			scene.add(listMesh[currentMesh])
	}
	const updateImgValeur = function (e) {
		{
			pauseVideoMesh(),
				scene.remove(listMesh[currentMesh]),
				scene.add(listMesh[e]),
				(currentMesh = e),
				playVideoMesh()
		}
	}
	const verticalGlitch = function () {
		progress = {
			inten: 400,
		}
		gsap.to(progress, {
			inten: 0,
			duration: 0.5,
			ease: 'power2.out',
			onUpdate: function () {
				ampl = progress.inten
			},
		})
	}
	const raf = function () {
		let e = gsap.ticker.deltaRatio(),
			dt = 1 - Math.pow(0.8, e)
		;(oldX += ((x - oldX) / 3) * dt),
			inten((oldX - x + ampl) / 4),
			intenV((oldX - x + ampl) / 200),
			rendererP.setRenderTarget(targetP),
			rendererP.render(scene, camera),
			rendererP.setRenderTarget(null),
			rendererP.render(sceneP, dummyCameraP)
	}
	const playVideoMesh = function () {
		let e
		listMesh[currentMesh] &&
		null !== (e = listMesh[currentMesh]) &&
		void 0 !== e &&
		e.material.map.isVideoTexture &&
		((listMesh[currentMesh].material.map.needsUpdate = !0),
			listMesh[currentMesh].material.map.source.data.play())
	}
	const pauseVideoMesh = function () {
		let e
		listMesh[currentMesh] &&
		null !== (e = listMesh[currentMesh]) &&
		void 0 !== e &&
		e.material.map.isVideoTexture &&
		listMesh[currentMesh].material.map.source.data.pause()
	}
	const changeSubset = function (e) {
		pauseVideoMesh()
		subset = e
		updateTrail()
	}
	const dispose = function () {
		ScrollTrigger.ticker.remove(raf),
			renderer.dispose(),
			renderer.forceContextLoss(),
			pauseVideoMesh()
		st && st.kill()
		for (var i = 0; i < listMedias.length; i++)
			listMesh[i].geometry.dispose(), listMesh[i].material.dispose()
	}
	void 0 === l &&
	(st = ScrollTrigger.create({
		trigger: elmtParent,
		start: 'top bottom',
		end: 'bottom top',
		onEnter: onEnter,
		onLeave: onLeave,
		onEnterBack: onEnter,
		onLeaveBack: onLeave,
	}))
}

const AnotherSCroller = () => {
	const [isActive, setIsActive] = useState(false)
	const [isCulturePage, setIsCulturePage] = useState(false)
	const [isContactPage, setIsContactPage] = useState(false)
	const [isFooterForm, setIsFooterForm] = useState('')
	const [megaTitre, setMegaTitre] = useState('')
	const [pastilleLabel, setPastilleLabel] = useState('')
	const [addresses, setAddresses] = useState([])
	const [imgFond, setImgFond] = useState(null)
	const [incrementTrail, setIncrementTrail] = useState(0)
	const [oldX, setOldX] = useState(0)
	const tweens = useRef([])
	const initTweens = () => {
		let e = gsap.to(imgFond, {
			y: '-10vh',
			ease: 'none',
			scrollTrigger: {
				trigger: imgFond.parentNode,
				start: 'top bottom',
				end: 'bottom top',
				scrub: !0,
				invalidateOnRefresh: !0,
			},
		})
		tweens.current.push(e),
			(e = gsap.to(this, {
				scrollTrigger: {
					trigger: '.wander',
					start: 'top bottom',
					end: 'top bottom',
					onEnter: function () {
						gsap.ticker.add(t.animate), t.canvas && v.a.addListener(t.increment)
					},
					onLeaveBack: function () {
						gsap.ticker.remove(t.animate), t.canvas && v.a.removeListener(t.increment)
					},
					refreshPriority: 7,
				},
			})),
			tweens.current.push(e),
			(e = gsap.to(this, {
				scrollTrigger: {
					trigger: '.progress',
					start: 'top bottom',
					end: 'top bottom',
					onLeave: function () {
						isActive && window.addEventListener('wheel', t.onWheel)
					},
					onEnterBack: function () {
						isActive &&
						(Object(d.a)()
							? (gsap.killTweensOf('.diskDevant circle'),
								gsap.set('.diskDevant circle', {
									strokeDashoffset: 184,
								}))
							: t.reset())
					},
					refreshPriority: 7,
				},
			}))
		tweens.current.push(e)
	}
	const canvas = useRef(null)
	const $el = useRef(null)
	const $refs = useRef(null)
	
	const init = () => {
	}
	const onActivate = () => {
		gsap.delayedCall(1, () => {
		})
	}
	const xSet = gsap.quickSetter(n, 'x', 'px'),
		ySet = gsap.quickSetter(n, 'y', 'px'),
		xSet2 = gsap.quickSetter(progress, 'x', 'px'),
		ySet2 = gsap.quickSetter(progress, 'y', 'px')
	const handleMounted = () => {
		let {isMobile} = useIsMobile()
		if (!isMobile) {
			let t = getSubset()
			canvas.current = new f.a(
				$el.querySelector('.h-vignetteInner'),
				$el.querySelector('.wander'),
				void 0,
				t,
			)
		}
		;(imgFond = $el.querySelector('.imgFond')),
			(incrementTrail = 0),
			(oldX = 0),
			(pos = {
				x: window.innerWidth / 2,
				y: window.innerHeight / 2,
				x2: window.innerWidth / 2,
			}),
			(progress = 0),
			(deltaY = 0)
		var n = $el.querySelector('.vignette')
		gsap.set(n, {
			xPercent: -50,
			yPercent: -110,
		})
		var progress = $el.querySelector('.etiquette')
		gsap.set(progress, {
			xPercent: 50,
			yPercent: 80,
		}),
		isActive && gsap.delayedCall(1, initTweens),
			initInterval(),
			c.a.create({
				trigger: $refs.haut,
				start: 'top bottom',
				end: 'bottom tom',
				immediateRender: !1,
				refreshPriority: 1,
				onEnter: function () {
					!e.isContactPage && e.$refs.video && e.$refs.video.enterPlay()
				},
				onEnterBack: function () {
					!e.isContactPage && e.$refs.video && e.$refs.video.enterPlay()
				},
				onLeave: function () {
					!e.isContactPage && e.$refs.video && e.$refs.video.pause()
				},
				onLeaveBack: function () {
					!e.isContactPage && e.$refs.video && e.$refs.video.pause()
				},
			})
	}
	let S = {
		watch: {
			$route: function (e, t) {
				var n,
					r,
					o,
					c,
					d = this,
					m =
						(null == e || null === (n = e.name) || void 0 === n ? void 0 : n.includes('work-id')) ||
						(null == e || null === (r = e.name) || void 0 === r ? void 0 : r.includes('equipe')),
					v = e.name && (null === (o = e.name) || void 0 === o ? void 0 : o.includes('culture__'))
				;(isContactPage =
					e.name && (null === (c = e.name) || void 0 === c ? void 0 : c.includes('contact__'))),
					reset(),
					kill(),
					(isActive = !m),
				isActive &&
				gsap.delayedCall(1, function () {
					d.initTweens(),
						(d.isFooterForm = ''),
						document.getElementById('footer').classList.remove('videoOff'),
					!d.isContactPage && d.$refs.video && d.$refs.video.play()
				}),
					gsap.delayedCall(1, function () {
						var e = v !== d.isCulturePage
						if (((d.isCulturePage = v), d.canvas && e)) {
							var t = d.getSubset()
							d.canvas.changeSubset(t)
						}
						d.initInterval()
					})
			},
		},
		beforeDestroy: function () {
			gsap.ticker.remove(animate)
		},
		methods: {
			toFooterForm: function () {
				var e = this
				;(isFooterForm = 'on'),
					$el.scrollIntoView(!0),
					gsap.delayedCall(0.4, function () {
						e.$refs.video && e.$refs.video.pause(),
							document.getElementById('footer').classList.add('videoOff')
					})
			},
			getVideoUrl: function (data) {
				return JSON.parse(data).files.find(function (e) {
					return '540p' === e.rendition
				}).link
			},
			initInterval: function () {
				var e = this
				window.innerWidth < 768 &&
				($refs.vignetteFooter.querySelector('.media.current') &&
				$refs.vignetteFooter.querySelector('.media.current').classList.remove('current'),
					(debut = getSubset()[0]),
					(fin = getSubset()[1] - 1),
					(current = debut),
					$refs.vignetteFooter.querySelectorAll('.media')[debut].classList.add('current'),
					(st = c.a.create({
						trigger: '.wander',
						start: 'top bottom',
						end: 'top bottom',
						onEnter: function () {
							e.interval()
						},
						onLeaveBack: function () {
							e.killInterval()
						},
					})))
			},
			initTweens: function () {
				var e,
					t = this
				;(tweens = []),
					(e = gsap.to(imgFond, {
						y: '-10vh',
						ease: 'none',
						scrollTrigger: {
							trigger: imgFond.parentNode,
							start: 'top bottom',
							end: 'bottom top',
							scrub: !0,
							invalidateOnRefresh: !0,
						},
					})),
					tweens.push(e),
					(e = gsap.to(this, {
						scrollTrigger: {
							trigger: '.wander',
							start: 'top bottom',
							end: 'top bottom',
							onEnter: function () {
								gsap.ticker.add(t.animate), t.canvas && v.a.addListener(t.increment)
							},
							onLeaveBack: function () {
								gsap.ticker.remove(t.animate), t.canvas && v.a.removeListener(t.increment)
							},
							refreshPriority: 7,
						},
					})),
					tweens.push(e),
					(e = gsap.to(this, {
						scrollTrigger: {
							trigger: '.progress',
							start: 'top bottom',
							end: 'top bottom',
							onLeave: function () {
								t.isActive && window.addEventListener('wheel', t.onWheel)
							},
							onEnterBack: function () {
								t.isActive &&
								(Object(d.a)()
									? (gsap.killTweensOf('.diskDevant circle'),
										gsap.set('.diskDevant circle', {
											strokeDashoffset: 184,
										}))
									: t.reset())
							},
							refreshPriority: 7,
						},
					})),
					tweens.push(e)
			},
			chaine: function (param) {
				return Object(m.f)(param)
			},
			interval: function () {
				var e = this
				monInterval = setInterval(function () {
					e.$refs.vignetteFooter.querySelector('.media.current').classList.remove('current'),
						e.current < e.fin ? e.current++ : (e.current = e.debut),
						e.$refs.vignetteFooter.querySelectorAll('.media')[e.current].classList.add('current')
				}, 4e3)
			},
			killInterval: function () {
				clearInterval(monInterval)
			},
			onMouseEnter: function (e) {
				gsap.set(e.target.firstChild.children, {
					autoAlpha: 0,
				}),
					Object(m.c)(e.target)
			},
			onWheel: function (e) {
				var t = this
				;(deltaY = e.deltaY < 0 ? 10 * e.deltaY : e.deltaY),
					window.clearTimeout(isWheeling),
					(isWheeling = setTimeout(function (e) {
						t.deltaY = 0
					}, 66))
			},
			increment: function () {
				;(incrementTrail += Math.abs(v.a.x - oldX)),
					(oldX = v.a.x),
					(canvas.x = v.a.x),
					(canvas.y = v.a.y),
				incrementTrail > 400 && ((incrementTrail = 0), canvas.updateTrail())
			},
			animate: function () {
				var e = this
				if (!Object(d.a)()) {
					var dt = 1 - Math.pow(0.75, gsap.ticker.deltaRatio())
					;(pos.x +=
						(v.a.x - pos.x - (v.a.x / window.innerWidth - 0.5) * (0.265 * window.innerWidth)) *
						(dt / 1.6)),
						(pos.y += (v.a.y - pos.y) * (dt / 1.6)),
						(pos.x2 += (v.a.x - pos.x2) * (dt / 1.6)),
						xSet(pos.x),
						ySet(pos.y),
						xSet2(pos.x2),
						ySet2(pos.y)
				}
				;(progress += 2 * deltaY), progress < 0 && (progress = 0)
				var t = 184 - progress / 40
				gsap.set('.diskDevant circle', {
					strokeDashoffset: t,
					onUpdate: function () {
						e.$refs.nombre.textContent = Math.floor(100 - t / 1.84)
					},
				}),
				progress / 40 > 184 && !Object(d.a)() && transition()
			},
			transition: function () {
				var e = isCulturePage ? 'work' : 'culture'
				gsap.set('.diskDevant circle', {
					strokeDashoffset: 0,
				}),
					gsap.ticker.remove(animate),
					reset(),
					kill(),
					($refs.nombre.textContent = '100'),
					$store.commit('ui/LOCK_SCROLL'),
					$router.push({
						path: localePath('/'.concat(e, '/')),
					})
			},
			reset: function () {
				window.removeEventListener('wheel', onWheel),
					window.clearTimeout(isWheeling),
					(progress = 0),
					gsap.set('.diskDevant circle', {
						strokeDashoffset: 184,
					}),
					killInterval()
			},
			kill: function () {
				tweens &&
				(tweens.forEach(function (e) {
					e.scrollTrigger && e.scrollTrigger.kill(!1), e.kill()
				}),
					(tweens = null)),
				st && st.kill()
			},
			getSubset: function () {
				return isCulturePage
					? [0, inHomeProjects.length]
					: [inHomeProjects.length, inHomeProjects.length + pinnedArticles.length]
			},
			getImgUrl: function (data) {
				var i = data.mediaDetails.sizes.find(function (s) {
					return '1000' === s.width
				})
				return i ? i.sourceUrl : data.sourceUrl
			},
			apparitionVignette: function () {
				gsap.to($el.querySelectorAll('.h-vignetteInner'), {
					scale: 1,
					ease: 'power2.inOut',
					duration: 0.5,
				}),
					gsap.to($el.querySelectorAll('canvas'), {
						scale: 1 === Math.min(window.devicePixelRatio, 2) ? 1 : 0.5,
						ease: 'power2.inOut',
						duration: 0.5,
					}),
					document.querySelector('.wander .pastille').classList.add('on')
			},
			disparitionVignette: function () {
				Object(d.a)() ||
				(gsap.to($el.querySelectorAll('.h-vignetteInner'), {
					scale: 0,
					ease: 'power2.inOut',
					duration: 0.5,
				}),
					gsap.to($el.querySelectorAll('canvas'), {
						scale: 3,
						ease: 'power2.inOut',
						duration: 0.5,
					}),
					document.querySelector('.wander .pastille').classList.remove('on'))
			},
		},
	}
}
