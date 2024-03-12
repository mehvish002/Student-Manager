const a=10;
function grandparent(){
    let b = 5;
    function parent(){
        let c=6;
        console.log(a,b,c);
    }
    return parent;
}
// parent();
const prnt = grandparent();
prnt();