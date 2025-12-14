(()=>{
  let PANEL_WIDTH = 500; // px default — updated from first image
  let PANEL_HEIGHT = 500; // px default — updated from first image
  // Use viewport height percentages for thresholds per request:
  let FLIP_THRESHOLD = window.innerHeight * 0.2; // 20% of screen height
  let SLIDE_THRESHOLD = window.innerHeight * 0.8; // 80% of screen height
  const FLIP_TIME = 200; // ms per half
  const SLIDE_TIME = 500; // ms

  const panelsEl = document.getElementById('panels');
  const panels = Array.from(document.querySelectorAll('.panel'));
  let current = 0;
  let showingBack = false; // for current panel
  const revealedBack = panels.map(()=>false); // whether back has been revealed at least once
  const lockFlip = panels.map(()=>false); // temporary lock to prevent flip immediately after slide

  let accumulating = 0; // in px, positive => scrolling down
  let busy = false;

  function clamp(i){ return Math.max(0, Math.min(i, panels.length-1)); }

  // Read panel size from first image (assume all images same intrinsic size)
  function updatePanelSizeFromImages(){
    const viewport = document.querySelector('.viewport');
    const firstImg = document.querySelector('.panel .face.front img');
    if(!firstImg) return;
    function applySize(nw, nh){
      // compute responsive size that fits within viewport while keeping aspect ratio
      const maxW = window.innerWidth * 0.9; // allow some padding
      const maxH = window.innerHeight * 0.9; // avoid full-bleed
      let targetW = Math.min(nw, maxW);
      let targetH = targetW * (nh / nw);
      if(targetH > maxH){
        targetH = maxH;
        targetW = targetH * (nw / nh);
      }
      // set CSS variables to computed display size
      document.documentElement.style.setProperty('--panel-width', Math.round(targetW) + 'px');
      document.documentElement.style.setProperty('--panel-height', Math.round(targetH) + 'px');
      // update internal displayed sizes (use integer pixels to avoid sub-pixel seams)
      PANEL_WIDTH = Math.round(targetW);
      PANEL_HEIGHT = Math.round(targetH);
      // ensure panels container is positioned to current panel
      const y = Math.round(current * PANEL_HEIGHT);
      panelsEl.style.transform = `translate3d(0, -${y}px, 0)`;
    }

    if(firstImg.complete && firstImg.naturalWidth){
      applySize(firstImg.naturalWidth, firstImg.naturalHeight);
    } else {
      firstImg.addEventListener('load', ()=>{
        applySize(firstImg.naturalWidth, firstImg.naturalHeight);
      }, {once:true});
    }
  }

  // call once on init
  updatePanelSizeFromImages();
  // recalc thresholds and panel displayed size on resize
  window.addEventListener('resize', ()=>{
    FLIP_THRESHOLD = window.innerHeight * 0.2;
    SLIDE_THRESHOLD = window.innerHeight * 0.8;
    updatePanelSizeFromImages();
  });

  function setPanelFace(index, back){
    const p = panels[index];
    p.classList.toggle('showing-back', back);
    const front = p.querySelector('.face.front');
    const backEl = p.querySelector('.face.back');
    if(back){
      front.style.transform = 'translateX(-50%) scaleX(0)';
      backEl.style.transform = 'translateX(-50%) scaleX(1)';
    } else {
      front.style.transform = 'translateX(-50%) scaleX(1)';
      backEl.style.transform = 'translateX(-50%) scaleX(0)';
    }
  }

  function flipToBack(index){
    if(busy) return Promise.resolve(false);
    if(lockFlip[index]) return Promise.resolve(false);
    busy = true;
    const p = panels[index];
    const front = p.querySelector('.face.front');
    const backEl = p.querySelector('.face.back');
    backEl.style.transition = `transform ${FLIP_TIME}ms linear`;
    front.style.transition = `transform ${FLIP_TIME}ms linear`;

    return new Promise(res=>{
      // shrink front (centered scaleX)
      front.style.transform = 'translateX(-50%) scaleX(0)';
      setTimeout(()=>{
        // start showing back (grow from tiny to full)
        backEl.style.transform = 'translateX(-50%) scaleX(0.01)';
        // ensure back is on top while growing
        p.classList.add('showing-back');
        // trigger next frame then expand
        requestAnimationFrame(()=>{
          backEl.style.transform = 'translateX(-50%) scaleX(1)';
        });
        setTimeout(()=>{
          revealedBack[index] = true;
          showingBack = true;
          busy = false;
          res(true);
        }, FLIP_TIME);
      }, FLIP_TIME);
    });
  }

  function flipToFront(index){
    if(busy) return Promise.resolve(false);
    if(lockFlip[index]) return Promise.resolve(false);
    const p = panels[index];
    const front = p.querySelector('.face.front');
    const backEl = p.querySelector('.face.back');
    busy = true;
    front.style.transition = `transform ${FLIP_TIME}ms linear`;
    backEl.style.transition = `transform ${FLIP_TIME}ms linear`;
    return new Promise(res=>{
      // shrink back
      backEl.style.transform = 'translateX(-50%) scaleX(0)';
      setTimeout(()=>{
        // show front from tiny to full
        front.style.transform = 'translateX(-50%) scaleX(0.01)';
        p.classList.remove('showing-back');
        requestAnimationFrame(()=> front.style.transform = 'translateX(-50%) scaleX(1)');
        setTimeout(()=>{
          showingBack = false;
          busy = false;
          res(true);
        }, FLIP_TIME);
      }, FLIP_TIME);
    });
  }

  function slideTo(index, targetShowBack=false){
    if(busy) return Promise.resolve(false);
    index = clamp(index);
    if(index === current){ return Promise.resolve(false); }
    const wasForward = index > current;
    busy = true;
    // Prepare the destination panel's face so it is visible during the slide.
    const dest = panels[index];
    const destFront = dest.querySelector('.face.front');
    const destBack = dest.querySelector('.face.back');
    if(targetShowBack){
      revealedBack[index] = true; // mark as seen
      // Temporarily lock flip for this panel to avoid immediate flip animation after slide
      lockFlip[index] = true;
      // disable transitions so the back appears instantly (no flip animation)
      destFront.style.transition = 'none';
      destBack.style.transition = 'none';
      // force back to shown state immediately
      setPanelFace(index, true);
      // Keep face transitions disabled during the slide so no flip animation
      // appears while panelsEl is animating. Restore face transitions after
      // the slide completes (SLIDE_TIME) so future flips animate normally.
      // Restoration is scheduled below after the slide promise resolves.
    } else {
      // If sliding forward (down direction), always show the front on arrival to avoid
      // unexpected "back" appearance when returning to a panel that previously had its back revealed.
      if(wasForward){
        setPanelFace(index, false);
      } else {
        // sliding upward to a panel (without explicit targetShowBack) — respect previous revealed state
        setPanelFace(index, revealedBack[index]);
      }
    }

    panelsEl.style.transition = `transform ${SLIDE_TIME}ms ease`;
    // Use integer pixel translate and translate3d to avoid sub-pixel rendering seams
    const translateY = Math.round(index * PANEL_HEIGHT);
    panelsEl.style.transform = `translate3d(0, -${translateY}px, 0)`;
    return new Promise(res=>{
      setTimeout(()=>{
        current = index;
        // after slide, set face according to whether targetShowBack or previously revealed
        if(targetShowBack){
          revealedBack[current] = true; showingBack = true;
        } else if(wasForward){
          // Arrived from forward slide: prefer showing front even if back was seen before
          showingBack = false;
        } else {
          showingBack = revealedBack[current] ? true : false;
        }
        // ensure faces reflect state: current panel follows `showingBack`, others show front
        panels.forEach((p,i)=>{
          if(i === current){
            setPanelFace(i, showingBack);
          } else {
            setPanelFace(i, false);
          }
        });
        // release flip lock after slide completes
        if(lockFlip[current]){
          // small delay so user doesn't immediately trigger flip by residual motion
          setTimeout(()=>{ lockFlip[current] = false; }, 120);
        }
        busy = false;
        // If we had disabled face transitions for targetShowBack, restore them now
        if(targetShowBack){
          const dst = panels[current];
          const dstF = dst.querySelector('.face.front');
          const dstB = dst.querySelector('.face.back');
          // restore transitions for future flips
          dstF.style.transition = `transform ${FLIP_TIME}ms linear`;
          dstB.style.transition = `transform ${FLIP_TIME}ms linear`;
        }
        res(true);
      }, SLIDE_TIME);
    });
  }

  // initialize layout
  panelsEl.style.transform = 'translateY(0px)';
  panels.forEach((p,i)=>{
    const front = p.querySelector('.face.front');
    const backEl = p.querySelector('.face.back');
    front.style.transform = 'translateX(-50%) scaleX(1)';
    backEl.style.transform = 'translateX(-50%) scaleX(0)';
  });

  // input handling: wheel and touch
  let touchStartY = null;
  let touchAcc = 0;

  function resetAcc(){ accumulating = 0; touchAcc = 0; touchStartY = null; }

  // initial size read
  updatePanelSizeFromImages();

  function handleDelta(deltaY){
    // If an animation (flip/slide) is in progress, ignore input to avoid
    // triggering additional flips/slides from residual wheel/touch events.
    if(busy) return;
    // positive -> down, negative -> up
    accumulating += deltaY;
    // Down
    if(accumulating > 0){
      if(!showingBack){
        if(accumulating >= FLIP_THRESHOLD){
          // flip front->back
          flipToBack(current).then(d=>{ resetAcc(); });
        }
      } else {
        if(accumulating >= SLIDE_THRESHOLD){
          // slide to next panel
          slideTo(current+1).then(()=> resetAcc());
        }
      }
    } else if(accumulating < 0){
      if(showingBack){
        if(Math.abs(accumulating) >= FLIP_THRESHOLD){
          flipToFront(current).then(()=> resetAcc());
        }
      } else {
        if(Math.abs(accumulating) >= SLIDE_THRESHOLD){
          // slide to previous panel and show its back
          slideTo(current-1, true).then(()=> resetAcc());
        }
      }
    }
  }

  // Wheel
  window.addEventListener('wheel', e=>{
    // control page scrolling
    e.preventDefault();
    const dy = e.deltaY;
    handleDelta(dy);
  }, {passive:false});

  // Touch
  window.addEventListener('touchstart', e=>{
    if(e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
    touchAcc = 0;
    document.documentElement.classList.add('touching');
  }, {passive:true});
  window.addEventListener('touchmove', e=>{
    if(touchStartY === null) return;
    // Prevent native scrolling on mobile (iOS Safari) while handling gestures
    // (handler registered with {passive:false} so preventDefault takes effect)
    e.preventDefault();
    const y = e.touches[0].clientY;
    const delta = touchStartY - y; // positive when swiping up? we want positive for scrolling down in content
    // We define positive as scroll down (finger swipe up -> delta>0). Keep consistent with wheel where deltaY>0 means down.
    touchAcc += delta;
    touchStartY = y;
    handleDelta(touchAcc);
  }, {passive:false});
  window.addEventListener('touchend', e=>{
    touchStartY = null; touchAcc = 0; document.documentElement.classList.remove('touching'); resetAcc();
  });

  // Keyboard arrows (optional convenience)
  window.addEventListener('keydown', e=>{
    if(e.key === 'ArrowDown'){
      // simulate a large positive delta
      handleDelta(SLIDE_THRESHOLD+10);
    } else if(e.key === 'ArrowUp'){
      handleDelta(-SLIDE_THRESHOLD-10);
    }
  });

  // expose a small hint
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerText = '縦スクロールでパネル操作（マウス/タッチ対応）';
  document.body.appendChild(hint);

  // Make sure faces reflect initial state
  setPanelFace(0, false);
  panels.forEach((p,i)=>{ if(i!==0) setPanelFace(i,false); });

})();
