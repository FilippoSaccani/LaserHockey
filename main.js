import * as THREE from 'three';
import * as CANNON from 'cannon';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();


//scena
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xa0a0a0 );
scene.add(new THREE.AxesHelper(5))


//telecamera
const camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);
camera.near = 0;
camera.far = 200;


//renderizzatore
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.style.cursor = "none";

const world = CANNON.World();
world.gravity = new CANNON.Vector3(0, -9.82, 0);

//piano di sfondo
const planeGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
const planeMaterial = new THREE.MeshStandardMaterial({color: 0x000000});
const plane = new THREE.Mesh( planeGeometry, planeMaterial );
plane.receiveShadow = true;
plane.position.set(0, 0, 0);
scene.add(plane);


//limiti campo di gioco
const deltaFromHorizontalBorder = 300;
const deltaFromVerticalBorder = 50

const horizontalWallGeometry = new THREE.BoxGeometry(window.innerWidth-2*deltaFromHorizontalBorder, 10, 20);
const verticalWallGeometry = new THREE.BoxGeometry(10, window.innerHeight-2*deltaFromVerticalBorder, 20);
const wallMaterial = new THREE.MeshBasicMaterial({color: 0x111100});

const northWallPosY =  (window.innerHeight/2) - deltaFromVerticalBorder;
const eastWallPosX = (window.innerWidth/2) - deltaFromHorizontalBorder;
const southWallPosY = (-window.innerHeight/2) + deltaFromVerticalBorder;
const westWallPosX = (-window.innerWidth/2) + deltaFromHorizontalBorder;
const halfField = 0;

const northWall = new THREE.Mesh( horizontalWallGeometry, wallMaterial );
northWall.position.set(0, northWallPosY, 0);
northWall.castShadow = true;
scene.add(northWall);
northWall.geometry.computeBoundingBox();


const eastWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
eastWall.position.set(eastWallPosX, 0, 0);
eastWall.castShadow = true;
scene.add(eastWall);
eastWall.geometry.computeBoundingBox();


const southWall = new THREE.Mesh(horizontalWallGeometry, wallMaterial);
southWall.position.set(0, southWallPosY, 0);
southWall.castShadow = true;
scene.add(southWall);
southWall.geometry.computeBoundingBox();


const westWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
westWall.position.set(westWallPosX, 0, 0);
westWall.castShadow = true;
scene.add(westWall);
westWall.geometry.computeBoundingBox();


//GIOCATORI
const playerLength = 150;
const playerWidth = 10;

const playerGeometry = new THREE.BoxGeometry(playerWidth, playerLength, 20);

const player1Material = new THREE.MeshBasicMaterial({color: 0xff0000});
const player1 = new THREE.Mesh( playerGeometry, player1Material );
player1.position.set(westWallPosX + 200, 0, 0);
scene.add(player1);

const player2Material = new THREE.MeshBasicMaterial({color: 0x0000ff});
const player2 = new THREE.Mesh( playerGeometry, player2Material );
player2.position.set(eastWallPosX - 200, 0, 0);
scene.add(player2);


//DISCO
const discRadius = 30;
let discDeltaX = 0.5;
let discDeltaY = 0.5;

const discGeometry = new THREE.CircleGeometry(discRadius);
const discMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
const disc = new THREE.Mesh( discGeometry, discMaterial );
disc.position.set(0, 0, 0);
scene.add(disc);

function screenXToCartesian(x) {
    return x-(window.innerWidth/2);
}

function screenYToCartesian(y) {
    return (window.innerHeight/2)-y;
}

function distanceFromPoint(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}
function moveBar(event) {
    let x = screenXToCartesian( event.x );
    let y = screenYToCartesian( event.y );

    //controllo dei bordi
    if (x < halfField && x > westWallPosX + playerWidth/2) player1.position.x = x;
    else {
        if (x > halfField) player1.position.x = halfField;
        if (x < westWallPosX + playerWidth/2) player1.position.x = westWallPosX + playerWidth/2;
    }

    if (y < northWallPosY - playerLength/2 && y > southWallPosY + playerLength/2) player1.position.y = y;
    else {
        if (y > northWallPosY - playerLength/2) player1.position.y = northWallPosY - playerLength/2;
        if (y < southWallPosY + playerLength/2) player1.position.y = southWallPosY + playerLength/2
    }
}

function moveDisc() {
    disc.position.x += discDeltaX;
    disc.position.y += discDeltaY;
}

function playersLookAtDisc(){
    player1.lookAt(disc.position);
    player2.lookAt(disc.position);
}

function update() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

//loop
function animate() {
    requestAnimationFrame( animate );

    renderer.domElement.onmousemove = moveBar;
    window.onresize = update;

    //moveDisc();
    playersLookAtDisc();

    renderer.render( scene, camera );
}

animate();