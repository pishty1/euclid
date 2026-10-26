// Frame-rate-independent, session-local clock. Never restore wall time from saves.
const STEP_MS=250, MAX_FRAME_GAP_MS=1000;
function createClock(){
  let last=null,pending=0;
  return {
    reset(){last=null;pending=0;},
    advance(now,suspended=false){
      if(suspended||!Number.isFinite(now)){last=null;pending=0;return 0;}
      if(last===null){last=now;return 0;}
      const delta=now-last;last=now;
      // Hidden tabs, blocking dialogs and long stalls must not generate a burst
      // of bot actions when the player returns.
      if(delta<0||delta>MAX_FRAME_GAP_MS){pending=0;return 0;}
      pending+=delta;
      const steps=Math.floor(pending/STEP_MS);pending-=steps*STEP_MS;
      return steps;
    }
  };
}
module.exports={createClock,STEP_MS,MAX_FRAME_GAP_MS};
