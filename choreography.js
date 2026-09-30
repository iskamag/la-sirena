// Cuts follow tracker orders; transformations remain in their world long enough
// to develop. The cat opens the transmission, then yields to the environments.
const opening=[
  [9,0],[9,1],[9,8],[7,2],[8,0],[9,9],[0,4],[7,6],[9,10],[8,3],
  [1,0],[1,3],[7,2],[8,5],[1,6],[9,9],[7,7],[1,6],
];
export function directShot({order,row,chapter,poster=false}) {
  if(poster)return{scene:9,shot:0,density:.56};
  let scene=chapter.world,shot=Math.floor(order/2)%8;
  if(order<opening.length){[scene,shot]=opening[order];}
  // LS03 develops one accelerating passage; LS04 holds its architectural event.
  else if(chapter.index===2)scene=2;
  else if(chapter.index===3){scene=3;shot=0;}
  else if(chapter.index===4){
    if(order>=57&&order<=60){scene=10;shot=0;}
    else if(order===54||order===55){scene=8;shot=5;}
  } else if(chapter.index===5){
    if(order===72||order===73){scene=10;shot=1;}
    else if(order===75&&row>=32){scene=2;shot=7;}
  } else if(chapter.index===1&&order===21){scene=9;shot=10;}
  // The finale sustains its water ecology rather than cutting between lenses.
  if(chapter.index===6)shot=0;
  return{scene,shot,density:chapter.index===6?.78:scene===9?.72:1};
}
