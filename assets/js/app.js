addEventListener("DOMContentLoaded", () => {
  

const utils = {}

utils.splitTrimFilter = function(str, separator = '') {
  return str.split(separator).map(option => option.trim()).filter(option => !!option)
}

utils.listenOutside = function(element, callback) {
  setTimeout(() => {
    document.addEventListener('click', close)
    window.addEventListener('keydown', close)
  }, 0)

  function close(e) {
    if(e.type === 'keydown' && e.key === 'ESCAPE') {
      callback()
    } else if(e.type === 'click' && !element.contains(e.target)) {
      callback()
    } else {
      return
    }

    document.removeEventListener('click', close)
    window.removeEventListener('keydown', close)
  }
}

utils.isMobile = function() {
  return /Mobi|Android/i.test(navigator.userAgent)
}

utils.maxmin = function(value, max, min = 0) {
  return Math.max(min, Math.min(value, max))
}

utils.checkWebpSupport = function() {
  const elem = document.createElement('canvas')
  if (!!(elem.getContext && elem.getContext('2d')))
    return elem.toDataURL('image/webp').indexOf('data:image/webp') == 0
  return false
}

utils.checkIntersectionObserverSupport = function() {
  if ('IntersectionObserver' in window &&
      'IntersectionObserverEntry' in window &&
      'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
  
    if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
      Object.defineProperty(window.IntersectionObserverEntry.prototype,
        'isIntersecting', {
        get: function () {
          return this.intersectionRatio > 0;
        }
      })
    }

    return true
  }

  return false
}


utils.round = function(number, places = 3) {
  return +number.toFixed(places)
}

utils.simpleEasing = function(array, ease_value = 0.1, places = 3) {
  array[1] += (array[0] - array[1]) * ease_value
  if (places) array[1] = this.round(array[1], places)
}

utils.cumulativeTop = function(element) {
  let top = 0
  do {
    top += element.offsetTop || 0
    element = element.offsetParent
  } while (element)

  return top
}


utils.loop = {
  frame_id: null,
  updated: {},
  length: 0,

  update(t) {
    for (let member in this.updated) this.updated[member](t)
    if (this.length > 0) this.frame_id = requestAnimationFrame(this.update)
  },

  add(name, fn) {
    this.updated[name] = fn
    if (this.length === 0) {
      this.length++
      this.run()
      return
    }

    this.length++
  },

  remove(name) {
    if (!this.updated[name]) return

    delete this.updated[name]
    this.length = Math.max(0, this.length - 1)
    if (this.length === 0) this.stop()
  },

  run() {
    this.stop()
    this.frame_id = requestAnimationFrame(this.update)
  },

  stop() {
    cancelAnimationFrame(this.frame_id)
  }
}
utils.loop.update = utils.loop.update.bind(utils.loop)
~function() {
  const container = document.querySelector('[data-lazy-container]')
  if(!container) return

  const options = {}
  options.wepb_supported = utils.checkWebpSupport()
  options.observer_supported = utils.checkIntersectionObserverSupport()
  options.global = parseContainerOptions(container.dataset.lazyContainer)
  options.active_media = {}
  container.removeAttribute('data-lazy-container')

  const elements = []

  container.querySelectorAll('[data-lazy]').forEach((element, i) => {
    const paths = parseElementOptions(element.dataset.lazy)
    element.lazy_element_id = i

    element.removeAttribute('data-lazy')

    elements.push({
      node: element,
      paths,
      load(index) {
        if(!this.visible) return

        if(this.node.tagName !== 'IMG') {
          this.node.style.backgroundImage = `url("${this.paths[index]}")`
        } else {
          this.node.src = this.paths[index]
        }
      }
    })
  })

  addEventListener('resize', resize)
  resize()

  function check(elements, allow_check_x = false) {
    for(let i = elements.length - 1; i >= 0; i--) {
      const { top: item_top, bottom: item_bottom, left: item_left, right: item_right } = elements[i].node.getBoundingClientRect()
      const document_width = document.documentElement.offsetWidth

      let offset_y = innerHeight, offset_x = innerWidth, check_x = true, check_y = true

      offset_y = innerHeight * options.global.offset_y[0]
      check_y = scrollY + offset_y > item_top && scrollY - offset_y < item_bottom + scrollY

      if(allow_check_x) {
        offset_x = innerWidth * options.global.offset_x[0]
        check_x = item_left > -offset_x && item_right < document_width + offset_x
      }

      if(check_y && check_x) {
        elements[i].intersected = true
        elements[i].load(options.active_media[0])
        elements.splice(i, 1)
      }
    }
  }

  if(options.global.method[0] == 'observer') {
    const checkIntersection = (entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          const match = elements[entry.target.lazy_element_id]
          observer.unobserve(match.node)
          match.intersected = true
          match.load(options.active_media[0])
        }
      })
    }

    const observer = new IntersectionObserver(checkIntersection, { threshold: 0 })
  
    if(options.observer_supported) {
      elements.forEach(element => observer.observe(element.node))
    } else {
      elements.forEach(element => {
        match.intersected = true
        element.load(options.active_media[0])
      })
    }
  }

  if(options.global.method[0] == 'interval') {
    const scroll_array = [...elements]
    let interval = null
    const checkIntersection = () => {
      check(scroll_array, true)
      if(!scroll_array.length) clearInterval(interval)
    }

    interval = setInterval(checkIntersection, 100)
  }

  if(options.global.method[0] == 'scroll') {
    const scroll_array = [...elements]
    const scroll = () => check(scroll_array)
    addEventListener('scroll', scroll); scroll()
  }

  function resize() {
    let matched_media = null

    options.global.media.forEach((media, i) => {
      if(matchMedia(media).matches) {
        matched_media = [i, media]
      }
    })

    elements.forEach(element => {
      element.visible = window.getComputedStyle(element.node, null).getPropertyValue("display") !== 'none' ? true : false
    })

    if(matched_media[1] !== options.active_media[1]) {
      options.active_media = matched_media

      elements.forEach(element => {
        if(element.visible && element.intersected) {
          element.load(options.active_media[0])
        }
      })
    }
  }

  function parseContainerOptions(options_string) {
    const options = {}

    utils.splitTrimFilter(options_string, ';').forEach(option => {
      const option_parts = utils.splitTrimFilter(option, '=')
      options[option_parts[0]] = utils.splitTrimFilter(option_parts[1], ',')
    })
  
    if(!options.media.length) return console.error(container, 'У контейнера нету @media данных')

    options.media = options.media.map(media => `(${media})`)
  
    options.offset_x = options.offset_x ? options.offset_x : [1]
    options.offset_y = options.offset_y ? options.offset_y : [1]
    options.method = options.method ? [options.method] : ['observer']

    return options
  }

  function parseElementOptions(option) {
    const option_parts = utils.splitTrimFilter(option, '::')
    const devices = { d: false, t: false, m: false }
    let filename = option_parts[0]
    if(option_parts[1] && option_parts[1] !== 'false') utils.splitTrimFilter(option_parts[1], '').forEach(device => devices[device] = true)
    const allow_webp = option_parts[2] && option_parts[2] === 'true' ? true : false
    const paths = []
    const extension_index = filename.lastIndexOf('.')
    let extension = extension_index !== -1 ? filename.slice(extension_index) : '.jpg'
    filename = extension_index !== -1 ? filename.slice(0, extension_index ) : filename

    const common_path = `${filename}${options.wepb_supported && allow_webp ? '.webp' : extension}`
    const desktop_path = `${filename}_desktop${options.wepb_supported && allow_webp ? '.webp' : extension}`
    const tablet_path = `${filename}_tablet${options.wepb_supported && allow_webp ? '.webp' : extension}`
    const mobile_path = `${filename}_mobile${options.wepb_supported && allow_webp ? '.webp' : extension}`

    for(let i = 0; i < options.global.media.length; i++) {
      if(i === 0) paths.push(devices.d ? desktop_path : common_path)
      if(i === 1) paths.push(devices.t ? tablet_path : devices.d ? desktop_path : common_path)
      if(i === 2) paths.push(devices.m ? mobile_path : devices.t ? tablet_path : devices.d ? desktop_path : common_path)
    }
    return paths
  }
}()
~function() {
  const elements = [...document.querySelectorAll('[data-onview]')].map((element, i) => {
    const state = {}
    
    utils.splitTrimFilter(element.dataset.onview, ';').forEach(option => {
      const parts = utils.splitTrimFilter(option, '=')
      state[parts[0]] = parts[1] ? parts[1] : true
    })

    state.name = 'el' + i
    state.node = element
    state.target = state.target === 'self' || !state.target ? element : document.querySelector(state.target)
    state.offset = state.offset ? +state.offset : 1
    state.effect = state.effect ? state.effect : 'in-view'
    state.var_holder = state.var_holder ? document.querySelector(state.var_holder) : state.node
    state.remove_delay = state.remove_delay ? +state.remove_delay : 0

    state.in_view = false
    state.loop_timeout = null
    state.remove_timeout = null

    if(state.loop) {
      state.value = [0, 0]
      state.ease = state.ease ? +state.ease : 0.1
    }

    state.update = function() {
      utils.simpleEasing(this.value, state.ease, 5)
      state.var_holder.style.setProperty('--in-view', this.value[1])
    }

    state.check = function() {
      const { top: item_top, bottom: item_bottom } = this.node.getBoundingClientRect()

      const offset = innerHeight * this.offset
      const check_y = scrollY + innerHeight + offset >= item_top + scrollY && scrollY - offset <= item_bottom + scrollY

      if(!this.in_view && check_y) {
        clearTimeout(this.remove_timeout)
        this.target.classList.add(this.effect)
        this.in_view = true

        if(this.once) return true

        if(this.loop) {
          clearTimeout(this.loop_timeout)
          this.loop_running = true
          this.start_value = utils.cumulativeTop(this.node) - innerHeight
          utils.loop.add(this.name, () => this.update())
        }

      } else if(this.in_view && !check_y) {
        this.in_view = false
        this.remove_timeout = setTimeout(() => {
          this.target.classList.remove(this.effect)
        }, this.remove_delay * 1000)
        
        if(this.loop) {
          this.loop_timeout = setTimeout(() => { 
            utils.loop.remove(this.name)
            this.loop_running = false
          }, 2000)
        }
      }

      if(this.loop && this.loop_running) {
        this.value[0] = utils.maxmin(1 / innerHeight * (scrollY - this.start_value), 1, 0)
      }
    }

    element.removeAttribute('data-onview')
    return state
  })

  function scroll() {
    for(let i = elements.length - 1; i >= 0; i--) {
      if(elements[i].ready) {
        if(elements[i].check()) elements.splice(i, 1)
      }
    }
  }

  function resize() {
    for(let i = elements.length - 1; i >= 0; i--) {
      if(elements[i].disable) {
        if(matchMedia(elements[i].disable).matches) {
          elements[i].ready = false
          elements[i].in_view = false
          elements[i].target.classList.remove(elements[i].effect)
        } else {
          elements[i].ready = true
          setTimeout(scroll, 0)
        }
      } else {
        elements[i].ready = true
        setTimeout(scroll, 0)
      }
    }
  }

  addEventListener('resize', resize); resize();
  addEventListener('scroll', scroll); 
}()
~function() {
  const classes = {
    next_button: '.h-gallery__slider__step-button_next',
    prev_button: '.h-gallery__slider__step-button_prev',
    assortment: '.h-gallery__slider__assortment',
    assortment_items: '.h-gallery__slider__assortment__item',
    assortment_item_current: 'h-gallery__slider__assortment__item_current',
    assortment_item_next: 'h-gallery__slider__assortment__item_next',
    assortment_item_prev: 'h-gallery__slider__assortment__item_prev',
  }

  const dom_elements = {
    next_button: document.querySelector(classes.next_button),
    prev_button: document.querySelector(classes.prev_button),
    assortment: document.querySelector(classes.assortment),
    assortment_items: document.querySelectorAll(classes.assortment_items),
  }


  if(!dom_elements.next_button) console.error('кнопки "вперед" не найдено')
  if(!dom_elements.prev_button) console.error('кнопки "назад" не найдено')
  if(!dom_elements.assortment) return console.error('список товаров не найден')
  if(!dom_elements.assortment_items.length) return console.error('список товаров пуст')

  
  const state = {}
  state._counter = 0
  state.counter = 0
  state._next = 0
  state.next = 0
  state._prev = 0
  state.prev = 0

  state.length = dom_elements.assortment_items.length
  dom_elements.next_button.addEventListener('click', () => step(1))
  dom_elements.prev_button.addEventListener('click', () => step(-1))

  function step(value) {
    state._counter += value
    state._counter %= state.length
    state.counter = state._counter < 0 ? state.length + state._counter : state._counter

    dom_elements.assortment_items.forEach(item => item.classList.remove(classes.assortment_item_current))
    dom_elements.assortment_items[state.counter].classList.add(classes.assortment_item_current)

    state._next = state._counter + 1
    state._next %= state.length
    state.next = state._next < 0 ? state.length + state._next : state._next

    dom_elements.assortment_items.forEach(item => item.classList.remove(classes.assortment_item_next))
    dom_elements.assortment_items[state.next].classList.add(classes.assortment_item_next)

    state._prev = state._counter - 1
    state._prev %= state.length
    state.prev = state._prev < 0 ? state.length + state._prev : state._prev

    dom_elements.assortment_items.forEach(item => item.classList.remove(classes.assortment_item_prev))
    dom_elements.assortment_items[state.prev].classList.add(classes.assortment_item_prev)
  }


  step(0)

}()
~function() {
  document.querySelectorAll('[data-hover-trigger]').forEach(trigger => {
    const target_name = trigger.dataset.hoverTrigger
    const target = document.querySelector(`[data-hover-target="${target_name}"]`)
    if(!target) return console.error(`таргет с именем "${target_name}" не найден`)

    trigger.addEventListener('mouseenter', () => {
      target.classList.add('triggered')
    })

    trigger.addEventListener('mouseleave', () => {
      target.classList.remove('triggered')
    })
  })
}()
    let scrollBtns = document.querySelectorAll('.js-scroll-btn'),
        addOffset = document.querySelector('.layout-header-holder') ? document.querySelector('.layout-header-holder').getBoundingClientRect().height + 10 : 0;
    scrollBtns.forEach(element => {        
        element.addEventListener('click', function(event){
            let scrollBlock = document.querySelector('.js-h-gallery__slider');
            event.preventDefault();            
            window.scrollTo({
                top: scrollBlock.getBoundingClientRect().top + window.scrollY,
                behavior: 'smooth'
            });            
            return false
        })
    });
})