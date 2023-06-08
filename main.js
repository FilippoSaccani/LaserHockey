import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

let scene, renderer, camera, world, player1, player2, disc, controls;
let meshes = [];
let bodies = [];


const northWallPosY =  (window.innerHeight/2) - deltaFromVerticalBorder;
const eastWallPosX = (window.innerWidth/2) - deltaFromHorizontalBorder;
const southWallPosY = (-window.innerHeight/2) + deltaFromVerticalBorder;
const westWallPosX = (-window.innerWidth/2) + deltaFromHorizontalBorder;

class Disc {
    height = 20;
    radius = 30;
    bodyMaterial = new CANNON.Material();
    geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
    material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    mesh;
    body;

    constructor() {
        this.mesh = new THREE.Mesh( this.geometry, this.material );

        this.body = new CANNON.Body({
            mass: 2,
            material: this.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.height),
            position: new CANNON.Vec3(0, 0, 0)
        });
        this.body.angularDamping = 1;
        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
        this.body.linearDamping = 0.0001;
    }
}

class Player {
    length = 150;
    width = 20;
    geometry = new THREE.BoxGeometry(this.width, this.length, 20);
    static bodyMaterial = new CANNON.Material();
    material;
    mesh;
    body;
}

class Player1 extends Player{
    constructor() {
        super();

        //three
        this.material = new THREE.MeshBasicMaterial({color: 0xff0000});
        this.mesh = new THREE.Mesh( this.geometry, this.material );

        //cannon
        this.body = new CANNON.Body({
            mass: 5,
            material: Player.bodyMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2, this.length/2, 20/2)),
            position: new CANNON.Vec3(westWallPosX + 200, 0, 0),
            type: CANNON.Body.KINEMATIC
        });
    }
}

class Player2 extends Player {
    constructor() {
        super();

        //three
        this.material = new THREE.MeshBasicMaterial({color: 0x0000ff});
        this.mesh = new THREE.Mesh( this.geometry, this.material );

        //cannon
        this.body = new CANNON.Body({
            mass: 5,
            material: Player.bodyMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2, this.length/2, 20/2)),
            position: new CANNON.Vec3(eastWallPosX - 200, 0, 0),
            type: CANNON.Body.KINEMATIC
        });
    }
}

class Wall {
    material = new THREE.MeshBasicMaterial({color: 0x111100});
    deltaFromHorizontalBorder = 300;
    deltaFromVerticalBorder = 50;
    width;
    height;
    depth;
    geometry;
    static bodyMaterial;
    mesh;
    body;
}

class HorizontalWall extends Wall{
    constructor() {
        super();

        this.width = window.innerWidth-2*this.deltaFromHorizontalBorder;
        this.height = 10;
        this.depth = 200;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh( this.geometry, this.material );

        this.body = new CANNON.Body({
            mass: 0
        })
    }

}

class VerticalWall extends Wall{
    constructor() {
        super();
    }
}


player1 = new Player1();
player2 = new Player2();
disc = new Disc();
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

function distanceFromPoint2D(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function initThree() {
    //scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );


    scene.add(player1.mesh);
    scene.add(player2.mesh);
    scene.add(disc.mesh);

    meshes.push(player1.mesh);
    meshes.push(player2.mesh);
    meshes.push(disc.mesh);


    //telecamera
    camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2);
    camera.position.set(0, 0, 2000);
    camera.lookAt(0, 0, 0);
    camera.near = 0;
    camera.far = 4000;


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
    const verticalWallGeometry = new THREE.BoxGeometry(10, window.innerHeight-2*deltaFromVerticalBorder, 200);



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


    controls = new OrbitControls( camera, renderer.domElement );


    window.onresize = update;
}

function initCannon() {
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, 0, 0)
    });
    let solver = new CANNON.GSSolver();
    solver = new CANNON.SplitSolver(solver);
    solver.iterations = 50;
    solver.tolerance = 0.00001;
    solver.k = 1000000;
    solver.d = 50;

    world.solver = solver;

    world.addBody(player1.body);
    world.addBody(player2.body);
    world.addBody(disc.body);

    bodies.push(player1.body);
    bodies.push(player2.body);
    bodies.push(disc.body);

    const wallMaterial = new CANNON.Material();

    const northWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(window.innerWidth-2*deltaFromHorizontalBorder/2, 10/2, 200/2)),
        position: new CANNON.Vec3(0, northWallPosY, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(northWallBody);
    bodies.push(northWallBody);

    const eastWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(10/2, window.innerHeight-2*deltaFromVerticalBorder/2, 200/2)),
        position: new CANNON.Vec3(eastWallPosX, 0, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(eastWallBody);
    bodies.push(eastWallBody);

    const southWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(window.innerWidth-2*deltaFromHorizontalBorder/2, 10/2, 200/2)),
        position: new CANNON.Vec3(0, southWallPosY, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(southWallBody);
    bodies.push(southWallBody);

    const westWallBody = new CANNON.Body({
        mass: 0,
        material: wallMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(10/2, window.innerHeight-2*deltaFromVerticalBorder/2, 200/2)),
        position: new CANNON.Vec3(westWallPosX, 0, 0),
        type: CANNON.Body.STATIC
    });
    world.addBody(westWallBody);
    bodies.push(westWallBody);


    //proprietà del contatto tra oggetti diversi:
    const wall_disc = new CANNON.ContactMaterial(wallMaterial, disc.material, {
        friction: 0,
        restitution: 1
    });

    const player1_disc = new CANNON.ContactMaterial(Player.bodyMaterial, disc.material, {
        friction: 0,
        restitution: 1
    });

    world.addContactMaterial(wall_disc);
    world.addContactMaterial(player1_disc);


    //fa si che i giocatori puntino sempre verso il disco

}


renderer.domElement.onmousemove = function(event) {
    let x = screenXToCartesian( event.x );
    let y = screenYToCartesian( event.y );

                                                                                                    //player1.body.position.x += event.movementX;
                                                                                                    //player1.body.position.y -= event.movementY;

    //controllo dei bordi
    if (x < 0 && x > westWallPosX + player1.width/2 + disc.radius) player1.body.position.x = x;
    else {
        if (x > 0) player1.body.position.x = 0;
        if (x < westWallPosX + player1.width/2) player1.body.position.x = westWallPosX + player1.width + disc.radius;
    }

    if (y < northWallPosY - player1.length/2 - 2*disc.radius && y > southWallPosY + player1.length/2 + disc.radius) player1.body.position.y = y;
    else {
        if (y > northWallPosY - player1.length/2) player1.body.position.y = northWallPosY - player1.length/2 - disc.radius;
        if (y < southWallPosY + player1.length/2) player1.body.position.y = southWallPosY + player1.length/2 + disc.radius;
    }
}

function rotatePlayer(player = new Player()) {
    let dist = distanceFromPoint2D(player.body.position.x, player.body.position.y, disc.body.position.x, disc.body.position.y)

    let direction = new CANNON.Vec3();
    player.body.position.vsub(disc.body.position, direction);

    direction.normalize();

    let angle = Math.atan2(direction.y, direction.x);
    player.body.quaternion.setFromEuler(0, 0, angle);
}

//loop
function animate() {
    requestAnimationFrame( animate );

    //scrive posizione e rotazione degi corpi di cannon.js sulle mesh di three.js
    for (let i = 0; i !== bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    rotatePlayer(player1);
    console.log(disc.body.position.z)
    disc.body.position.z = 0;

    world.fixedStep(1/700);

    controls.update();

    renderer.render( scene, camera );
}

