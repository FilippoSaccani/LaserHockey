import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';

let scene, renderer, camera, world, player1Body, player2Body, discBody;
let meshes = [];
let bodies = [];

const deltaFromHorizontalBorder = 300;
const deltaFromVerticalBorder = 50

const northWallPosY =  (window.innerHeight/2) - deltaFromVerticalBorder;
const eastWallPosX = (window.innerWidth/2) - deltaFromHorizontalBorder;
const southWallPosY = (-window.innerHeight/2) + deltaFromVerticalBorder;
const westWallPosX = (-window.innerWidth/2) + deltaFromHorizontalBorder;

const playerLength = 150;
const playerWidth = 10;

const discRadius = 30;

initThree();
initCannon();
animate();

function update() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function screenXToCartesian(x) {
    return x-(window.innerWidth/2);
}

function screenYToCartesian(y) {
    return (window.innerHeight/2)-y;
}

function distanceFromPoint(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function initThree() {
    //scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );


    //telecamera
    camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    camera.near = 0;
    camera.far = 200;


    //renderizzatore
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild( renderer.domElement );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.cursor = "none";


    //piano di sfondo
    const planeGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    const planeMaterial = new THREE.MeshStandardMaterial({color: 0x000000});
    const plane = new THREE.Mesh( planeGeometry, planeMaterial );
    plane.receiveShadow = true;
    scene.add(plane);


    //limiti campo di gioco
    const horizontalWallGeometry = new THREE.BoxGeometry(window.innerWidth-2*deltaFromHorizontalBorder, 10, 20);
    const verticalWallGeometry = new THREE.BoxGeometry(10, window.innerHeight-2*deltaFromVerticalBorder, 20);
    const wallMaterial = new THREE.MeshBasicMaterial({color: 0x111100});


    const northWall = new THREE.Mesh( horizontalWallGeometry, wallMaterial );
    scene.add(northWall);
    meshes.push(northWall);

    const eastWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
    scene.add(eastWall);
    meshes.push(eastWall);

    const southWall = new THREE.Mesh(horizontalWallGeometry, wallMaterial);
    scene.add(southWall);
    meshes.push(southWall);

    const westWall = new THREE.Mesh(verticalWallGeometry, wallMaterial);
    scene.add(westWall);
    meshes.push(westWall);


    //GIOCATORI
    const playerGeometry = new THREE.BoxGeometry(playerWidth, playerLength, 20);

    const player1Material = new THREE.MeshBasicMaterial({color: 0xff0000});
    const player1 = new THREE.Mesh( playerGeometry, player1Material );
    scene.add(player1);
    meshes.push(player1);

    const player2Material = new THREE.MeshBasicMaterial({color: 0x0000ff});
    const player2 = new THREE.Mesh( playerGeometry, player2Material );
    scene.add(player2);
    meshes.push(player2);


    //DISCO
    const discGeometry = new THREE.SphereGeometry(discRadius);
    const discMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const disc = new THREE.Mesh( discGeometry, discMaterial );
    scene.add(disc);
    meshes.push(disc);


    window.onresize = update;
}

function initCannon() {
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, 0, 0)
    });

    const wallMaterial = new CANNON.Material();
    const playerMaterial = new CANNON.Material();
    const discMaterial = new CANNON.Material();

    const northWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(window.innerWidth-2*deltaFromHorizontalBorder/2, 10/2, 20/2)),
        position: new CANNON.Vec3(0, northWallPosY, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(northWallBody);
    bodies.push(northWallBody);

    const eastWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(10/2, window.innerHeight-2*deltaFromVerticalBorder/2, 20/2)),
        position: new CANNON.Vec3(eastWallPosX, 0, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(eastWallBody);
    bodies.push(eastWallBody);

    const southWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(window.innerWidth-2*deltaFromHorizontalBorder/2, 10/2, 20/2)),
        position: new CANNON.Vec3(0, southWallPosY, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(southWallBody);
    bodies.push(southWallBody);

    const westWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(10/2, window.innerHeight-2*deltaFromVerticalBorder/2, 20/2)),
        position: new CANNON.Vec3(westWallPosX, 0, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(westWallBody);
    bodies.push(westWallBody);



    //GIOCATORI
    player1Body = new CANNON.Body({
        mass: 5,
        material: playerMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(playerWidth/2, playerLength/2, 20/2)),
        position: new CANNON.Vec3(westWallPosX + 200, 0, 0),
        type: CANNON.Body.KINEMATIC
    })
    world.addBody(player1Body);
    bodies.push(player1Body);

    //GIOCATORI
    player2Body = new CANNON.Body({
        mass: 5,
        material: playerMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(playerWidth/2, playerLength/2, 20/2)),
        position: new CANNON.Vec3(eastWallPosX - 200, 0, 0),
        type: CANNON.Body.KINEMATIC
    })
    world.addBody(player2Body);
    bodies.push(player2Body);

    discBody = new CANNON.Body({
        mass: 2,
        material: discMaterial,
        shape: new CANNON.Sphere(discRadius),
        position: new CANNON.Vec3(0, 0, 0)
    })
    world.addBody(discBody);
    bodies.push(discBody);

    //proprietà del contatto tra oggetti diversi:
    const wall_disc = new CANNON.ContactMaterial(wallMaterial, discMaterial, {
        friction: 0,
        restitution: 0.9
    });

    const player_disc = new CANNON.ContactMaterial(playerMaterial, discMaterial, {
        friction: 0.2,
        restitution: 0
    });

    world.addContactMaterial(wall_disc);
    world.addContactMaterial(player_disc);


    //fa si che i giocatori puntino sempre verso il disco
    /*
    const player1ToDisc = new CANNON.ConeTwistConstraint(player1Body, discBody, {
        pivotA: new CANNON.Vec3(0, 0, 0),
        pivotB: new CANNON.Vec3(0, 0, 0),
        axisA: new CANNON.Vec3(1, 0, 0),
        axisB: new CANNON.Vec3(0, 0, 0),
        upA: new CANNON.Vec3(0, 1, 0),
        upB: new CANNON.Vec3(0, 0, 0),
        angle: Math.PI/2
    });
    world.addConstraint(player1ToDisc);

     */
}

renderer.domElement.addEventListener("mousemove", function(event) {
    let x = screenXToCartesian( event.x );
    let y = screenYToCartesian( event.y );

    //controllo dei bordi
    if (x < 0 && x > westWallPosX + playerWidth/2) player1Body.position.x = x;
    else {
        if (x > 0) player1Body.position.x = 0;
        if (x < westWallPosX + playerWidth/2) player1Body.position.x = westWallPosX + playerWidth/2;
    }

    if (y < northWallPosY - playerLength/2 && y > southWallPosY + playerLength/2) player1Body.position.y = y;
    else {
        if (y > northWallPosY - playerLength/2) player1Body.position.y = northWallPosY - playerLength/2;
        if (y < southWallPosY + playerLength/2) player1Body.position.y = southWallPosY + playerLength/2
    }
})

//loop
function animate() {
    requestAnimationFrame( animate );



    for (let i = 0; i !== bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    world.fixedStep();

    renderer.render( scene, camera );
}

