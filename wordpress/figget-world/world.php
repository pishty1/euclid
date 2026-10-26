<?php
// Pure, timestamp-based rules: no WordPress or browser dependencies.
final class Figget_World {
    const SIZE = 48;
    const VERSION = 1;
    static function fresh($now) {
        $nodes = [];
        for ($y=2; $y<46; $y+=3) for ($x=2; $x<46; $x+=3) {
            if (abs($x-24)+abs($y-24)<=4) continue;
            $n = ($x*73+$y*137)%11;
            $kind = $n<5 ? 'wood' : ($n<9 ? 'food' : 'ore');
            $nodes[] = ['x'=>$x,'y'=>$y,'kind'=>$kind,'stock'=>8,'renewed'=>$now];
        }
        return ['version'=>self::VERSION,'revision'=>0,'players'=>[], 'nodes'=>$nodes,'buildings'=>[], 'events'=>[], 'nextEvent'=>1];
    }
    static function event(&$w,$p,$text,$now,$x=null,$y=null) {
        $w['events'][]=['id'=>$w['nextEvent']++,'time'=>$now,'actor'=>$p['name'],'player'=>$p['id'],'text'=>$text,'x'=>$x??$p['x'],'y'=>$y??$p['y']];
        $w['events']=array_slice($w['events'],-200);
    }
    static function advance(&$w,$now) {
        foreach ($w['nodes'] as &$node) {
            $steps=(int)floor(max(0,$now-$node['renewed'])/120);
            if ($steps>0) { $node['stock']=min(8,$node['stock']+$steps); $node['renewed']+=$steps*120; }
        }
    }
    static function join(&$w,$id,$name,$now) {
        $key=(string)$id;
        if (!isset($w['players'][$key])) {
            if (count($w['players'])>=2000) throw new RuntimeException('This prototype world has reached its character limit.');
            $w['players'][$key]=['id'=>$id,'name'=>$name,'x'=>24,'y'=>24,'health'=>100,'bag'=>['wood'=>0,'food'=>0,'ore'=>0], 'seen'=>$now,'acted'=>0,'requests'=>[], 'contribution'=>0,'deaths'=>0];
            self::event($w,$w['players'][$key],'arrived at the sanctuary',$now);
        }
        $p=&$w['players'][$key];
        $p['name']=$name;
        if ($now-$p['seen']>120) self::event($w,$p,'returned to the world',$now);
        $p['seen']=$now;
    }
    static function near($p,$x,$y) { return abs($p['x']-$x)+abs($p['y']-$y)<=1; }
    static function action(&$w,$id,$a,$request,$now) {
        $p=&$w['players'][(string)$id];
        if (isset($p['requests'][$request])) return $p['requests'][$request];
        if ($now-$p['acted']<0.5) return 'Please wait a moment between actions.';
        $type=$a['type']??''; $msg='Choose an action.';
        $x=$a['x']??null; $y=$a['y']??null;
        if (in_array($type,['move','gather','build','deposit','use'],true) && (!is_int($x)||!is_int($y)||$x<0||$y<0||$x>=self::SIZE||$y>=self::SIZE)) $msg='Choose a tile inside the world.';
        elseif ($type==='move') {
            if (abs($p['x']-$x)+abs($p['y']-$y)!==1) $msg='Move one tile north, south, east or west.';
            else { $p['x']=$x; $p['y']=$y; $msg='Moved.'; }
        } elseif ($type==='gather') {
            $found=false;
            foreach ($w['nodes'] as &$n) if ($n['x']===$x&&$n['y']===$y) {
                $found=true;
                if (!self::near($p,$x,$y)) $msg='Stand beside the resource to gather.';
                elseif ($n['stock']<1) $msg='Depleted. One unit regrows every two minutes.';
                elseif (array_sum($p['bag'])>=30) $msg='Your pack is full (30 units). Build or contribute to a depot.';
                else {
                    $n['stock']--; $kind=$n['kind'];
                    if ($kind==='ore') $p['health']=max(0,$p['health']-15);
                    if ($p['health']===0) {
                        foreach ($p['bag'] as &$v) $v=(int)floor($v/2);
                        unset($v); $p['health']=100; $p['deaths']++; $p['x']=24; $p['y']=24;
                        $msg='Mining claimed your life. Respawned at sanctuary; half your carried supplies were lost.';
                        self::event($w,$p,'died mining at '.$x.', '.$y.' and respawned',$now,$x,$y);
                    } else {
                        $p['bag'][$kind]++; $msg='Gathered '.$kind.($kind==='ore'?' · −15 health. Eat food to recover.':'.');
                        // Log gathering once per minute per character, rather than flood the shared journal.
                        if ($now-($p['gatherLog']??0)>=60) { self::event($w,$p,'gathered '.$kind,$now,$x,$y); $p['gatherLog']=$now; }
                    }
                }
                break;
            }
            if (!$found) $msg='There is no resource on this tile.';
        } elseif ($type==='build') {
            $blocked=false; $owned=0;
            foreach ($w['buildings'] as $b) { if ($b['x']===$x&&$b['y']===$y) $blocked=true; if ($b['owner']===$id) $owned++; }
            foreach ($w['nodes'] as $n) if ($n['x']===$x&&$n['y']===$y) $blocked=true;
            if (!self::near($p,$x,$y)) $msg='Stand beside the site to build.';
            elseif (abs($x-24)+abs($y-24)<=3) $msg='Keep the sanctuary clear.';
            elseif ($blocked) $msg='This tile is already occupied.';
            elseif ($owned>=8) $msg='You can maintain up to eight depots in this prototype.';
            elseif ($p['bag']['wood']<8||$p['bag']['ore']<2) $msg='A public depot costs 8 wood and 2 ore.';
            else {
                $p['bag']['wood']-=8; $p['bag']['ore']-=2;
                $w['buildings'][]=['x'=>$x,'y'=>$y,'owner'=>$id,'name'=>$p['name'],'food'=>0,'built'=>$now,'supplied'=>$now];
                self::event($w,$p,'built a public food depot',$now,$x,$y); $msg='Depot built. Anyone can stock it or eat here, including while you are offline.';
            }
        } elseif ($type==='deposit'||$type==='use') {
            $found=false;
            foreach ($w['buildings'] as &$b) if ($b['x']===$x&&$b['y']===$y) {
                $found=true;
                if (!self::near($p,$x,$y)) $msg='Stand beside this depot.';
                elseif ($type==='deposit') {
                    if ($p['bag']['food']<1) $msg='Gather food to contribute.';
                    elseif ($b['food']>=30) $msg='This depot is full.';
                    else { $p['bag']['food']--; $b['food']++; $b['supplied']=$now; $p['contribution']++; self::event($w,$p,'supplied '.$b['name']."’s depot",$now,$x,$y); $msg='Food delivered. Other players can use it while you are offline.'; }
                } elseif ($p['health']>=100) $msg='You are already at full health.';
                elseif ($b['food']<1) $msg='This depot needs food.';
                else { $b['food']--; $p['health']=min(100,$p['health']+30); self::event($w,$p,'ate at '.$b['name']."’s depot",$now,$x,$y); $msg='Recovered 30 health from the public depot.'; }
                break;
            }
            if (!$found) $msg='There is no depot here.';
        } elseif ($type==='eat') {
            if ($p['health']>=100) $msg='You are already at full health.';
            elseif ($p['bag']['food']<1) $msg='Gather food first.';
            else { $p['bag']['food']--; $p['health']=min(100,$p['health']+30); $msg='Ate food · +30 health.'; }
        }
        $p['acted']=$now; $p['requests'][$request]=$msg;
        if (count($p['requests'])>64) $p['requests']=array_slice($p['requests'],-64,null,true);
        return $msg;
    }
    static function snapshot($w,$id,$now) {
        $players=[];
        foreach ($w['players'] as $p) $players[]=['id'=>$p['id'],'name'=>$p['name'],'x'=>$p['x'],'y'=>$p['y'],'seen'=>$p['seen'],'online'=>$now-$p['seen']<90];
        $me=$w['players'][(string)$id]; unset($me['requests'],$me['acted'],$me['gatherLog']);
        return ['version'=>self::VERSION,'revision'=>$w['revision'],'time'=>$now,'size'=>self::SIZE,'me'=>$me,'players'=>$players,'nodes'=>$w['nodes'],'buildings'=>$w['buildings'],'events'=>$w['events']];
    }
}
