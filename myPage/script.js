(()=>{
  const PANEL_SIZE = 500; // px — images are 500x500
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
      // restore transitions next frame so later flips animate normally
      requestAnimationFrame(()=>{
        destFront.style.transition = `transform ${FLIP_TIME}ms linear`;
        destBack.style.transition = `transform ${FLIP_TIME}ms linear`;
      });
    } else {
      // ensure the destination has its correct face based on whether its back was revealed
      setPanelFace(index, revealedBack[index]);
    }

    panelsEl.style.transition = `transform ${SLIDE_TIME}ms ease`;
    panelsEl.style.transform = `translateY(-${index * PANEL_SIZE}px)`;
    return new Promise(res=>{
      setTimeout(()=>{
        current = index;
        // after slide, set face according to whether targetShowBack or previously revealed
        if(targetShowBack){ revealedBack[current] = true; showingBack = true; }
        showingBack = revealedBack[current] ? true : false;
        // ensure faces widths reflect state
        panels.forEach((p,i)=> setPanelFace(i, revealedBack[i] && i===current ? true : (i===current && showingBack)));
        // release flip lock after slide completes
        if(lockFlip[current]){
          // small delay so user doesn't immediately trigger flip by residual motion
          setTimeout(()=>{ lockFlip[current] = false; }, 120);
        }
        busy = false;
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

  // update thresholds on resize
  window.addEventListener('resize', ()=>{
    FLIP_THRESHOLD = window.innerHeight * 0.2;
    SLIDE_THRESHOLD = window.innerHeight * 0.8;
  });

  function handleDelta(deltaY){
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
