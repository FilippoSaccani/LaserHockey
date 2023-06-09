import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import {SpotLight, SpotLightHelper} from "three";

let scene, renderer, camera, world, controls;
let meshes = [];
let bodies = [];


class Disc {
    height = 20;
    radius = 30;
    bodyMaterial = new CANNON.Material();
    geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
    material = new THREE.MeshPhysicalMaterial({color: 0xffff00});
    mesh;
    body;

    constructor() {
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.body = new CANNON.Body({
            mass: 2,
            material: this.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.height),
            position: new CANNON.Vec3(0, 0, 0)
        });
        this.body.angularDamping = 1;
        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
        this.body.linearDamping = 0.1;
    }
}

class Player {
    radius = 70;
    depth = 20;
    geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.depth);
    static bodyMaterial = new CANNON.Material();
    material;
    mesh;
    body;
    points = 0;

    addPoint(amount){
        this.points += amount;
    }
}

class Player1 extends Player{
    constructor() {
        super();

        //three
        this.material = new THREE.MeshPhysicalMaterial({color: 0xff0000});
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        //cannon
        this.body = new CANNON.Body({
            mass: 5,
            material: Player.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.depth),
            position: new CANNON.Vec3(Wall.westWallPosX + 200, 0, 0),
            type: CANNON.Body.KINEMATIC,
        });

        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
    }
}

class Player2 extends Player {
    constructor() {
        super();

        //three
        this.material = new THREE.MeshPhysicalMaterial({color: 0x0000ff});
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;

        //cannon
        this.body = new CANNON.Body({
            mass: 5,
            material: Player.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.depth),
            position: new CANNON.Vec3(Wall.eastWallPosX - 200, 0, 0),
            type: CANNON.Body.KINEMATIC
        });

        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
    }
}

class Wall {
    material = new THREE.MeshPhysicalMaterial({color: 0x111100});
    static deltaFromHorizontalBorder = 200;
    static deltaFromVerticalBorder = 100;
    width;
    height;
    depth = 200;
    geometry;
    static bodyMaterial = new CANNON.Material();
    mesh;
    body;
    static northWallPosY =  (window.innerHeight/2) - this.deltaFromVerticalBorder;
    static eastWallPosX = (window.innerWidth/2) - this.deltaFromHorizontalBorder;
    static southWallPosY = (-window.innerHeight/2) + this.deltaFromVerticalBorder;
    static westWallPosX = (-window.innerWidth/2) + this.deltaFromHorizontalBorder;
}

class HorizontalWall extends Wall{
    constructor() {
        super();

        this.width = window.innerWidth-2*Wall.deltaFromHorizontalBorder;
        this.height = 10;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.body = new CANNON.Body({
            mass: 0,
            material: Wall.bodyMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2, this.height/2, this.depth/2)),
            type: CANNON.Body.STATIC
        })
    }
}

class VerticalWall extends Wall{
    constructor() {
        super();

        this.width = 10;
        this.height = (window.innerHeight-2*Wall.deltaFromVerticalBorder)/3;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.body = new CANNON.Body({
            mass: 0,
            material: Wall.bodyMaterial,
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2, this.height/2, this.depth/2)),
            type: CANNON.Body.STATIC
        })
    }
}

class Trigger {
    body;
    deltaFromWall = 300;
    constructor(wall = new VerticalWall()) {
        let x

        if (wall.body.position.x < 0) x = wall.body.position.x - 60;
        else x = wall.body.position.x + 60;

        this.body = new CANNON.Body({
            isTrigger: true,
            shape: new CANNON.Box(new CANNON.Vec3(wall.width/2, wall.height/2+this.deltaFromWall/2, wall.depth/2)),
            position: new CANNON.Vec3(x, 0, 0)
        });
    }
}

class Text {
    materials = [
        new THREE.MeshBasicMaterial({color: 0xffffff}), // front
        new THREE.MeshBasicMaterial({color: 0xa0a0a0}), // side
    ]
    mesh;
    size = 50;
    depth = 20;
    static font;
    constructor(text) {
        this.mesh = new THREE.Mesh(
            new TextGeometry( text, {
                font: Text.font,
                size: this.size,
                height: this.depth,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 3,
                bevelSize: 2,
                bevelOffset: 0,
                bevelSegments: 5
            }),
            this.materials
        );

        let geo =  this.mesh.geometry;
        geo.computeBoundingBox();
        let offset = - 0.5 * ( geo.boundingBox.max.x - geo.boundingBox.min.x);

        this.mesh.position.set(offset, window.innerHeight/2 - this.size - 20, 0);
    }

    static loadFont() {
        const fontLoader = new FontLoader();

        fontLoader.load("/node_modules/three/examples/fonts/helvetiker_bold.typeface.json", function ( response ){
            Text.font = response;
        })
    }
}

class Light{
    mesh
    constructor() {
        this.mesh = new THREE.PointLight(0xffffff, 100, 1000);

        //this.mesh.angle = Math.PI/2;

        this.mesh.castShadow = true;

        /*
        this.mesh.shadow.camera.near = 0.1;
        this.mesh.shadow.camera.far = 2000;
        this.mesh.shadow.mapSize.width = 2056;
        this.mesh.shadow.mapSize.height = 2056;
        this.mesh.shadow.bias = 0.0000001;

         */


        this.mesh.position.set(0, 0, 150);
    }
}

Text.loadFont();

let northWall = new HorizontalWall();
northWall.body.position.set(0, Wall.northWallPosY, 0);
meshes.push(northWall.mesh);
bodies.push(northWall.body);

let northEastWall = new VerticalWall();
northEastWall.body.position.set(Wall.eastWallPosX, northEastWall.height, 0);
meshes.push(northEastWall.mesh);
bodies.push(northEastWall.body);

let southEastWall = new VerticalWall();
southEastWall.body.position.set(Wall.eastWallPosX, -northEastWall.height, 0);
meshes.push(southEastWall.mesh);
bodies.push(southEastWall.body);

let southWall = new HorizontalWall();
southWall.body.position.set(0, Wall.southWallPosY, 0);
meshes.push(southWall.mesh);
bodies.push(southWall.body);

let southWestWall = new VerticalWall();
southWestWall.body.position.set(Wall.westWallPosX, -southWestWall.height, 0);
meshes.push(southWestWall.mesh);
bodies.push(southWestWall.body);

let northWestWall = new VerticalWall();
northWestWall.body.position.set(Wall.westWallPosX, southWestWall.height, 0);
meshes.push(northWestWall.mesh);
bodies.push(northWestWall.body);

let trigger1 = new Trigger(northWestWall);

let trigger2 = new Trigger(northEastWall);

let player1 = new Player1();
meshes.push(player1.mesh);
bodies.push(player1.body);

let player2 = new Player2();
meshes.push(player2.mesh);
bodies.push(player2.body);

let disc = new Disc();
meshes.push(disc.mesh);
bodies.push(disc.body);

let score = new Text("");
let light = new Light();


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


function initThree() {
    //scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );


    //telecamera
    camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2);
    camera.position.set(0, 0, 2000);
    camera.lookAt(0, 0, 0);
    camera.near = 0;
    camera.far = 3000;


    //renderizzatore
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild( renderer.domElement );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cursor = "none";


    //piano di sfondo
    const planeGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    const planeMaterial = new THREE.MeshPhysicalMaterial({color: 0x000000});
    const plane = new THREE.Mesh( planeGeometry, planeMaterial );
    plane.receiveShadow = true;
    scene.add(plane);

    //aggiunge tutte le mesh create in precedenza
    meshes.forEach(function (mesh) {
        scene.add(mesh);
    });

    scene.add(score.mesh);
    scene.add(light.mesh);

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

    world.addBody(trigger1.body);
    world.addBody(trigger2.body);

    bodies.forEach(function( body ){
        world.addBody(body);
    });


    //proprietà del contatto tra oggetti diversi:
    const wall_disc = new CANNON.ContactMaterial(Wall.bodyMaterial, disc.bodyMaterial, {
        friction: 0,
        restitution: 1
    });

    const player_disc = new CANNON.ContactMaterial(Player.bodyMaterial, disc.bodyMaterial, {
        friction: 0,
        restitution: 1
    });

    world.addContactMaterial(wall_disc);
    world.addContactMaterial(player_disc);
}

function setScore() {
    scene.remove(score.mesh);
    score = new Text(player1.points + " - " + player2.points);
    scene.add(score.mesh);
}

trigger1.body.addEventListener('collide', function () {
    player2.addPoint(0.5);
    setScore()
})

trigger2.body.addEventListener('collide', function () {
    player1.addPoint(0.5);
    setScore()
})

renderer.domElement.onmousemove = function(event) {
    let x = screenXToCartesian( event.x );
    let y = screenYToCartesian( event.y );

                                                                                                    //player1.body.position.x += event.movementX;
                                                                                                    //player1.body.position.y -= event.movementY;

    //controllo dei bordi
    if (x < 0 && x > Wall.westWallPosX + player1.radius) player1.body.position.x = x;
    else {
        if (x > 0) player1.body.position.x = 0;
        if (x < Wall.westWallPosX + player1.radius) player1.body.position.x = Wall.westWallPosX + player1.radius;
    }

    if (y < Wall.northWallPosY - player1.radius && y > Wall.southWallPosY + player1.radius) player1.body.position.y = y;
    else {
        if (y > Wall.northWallPosY - player1.radius) player1.body.position.y = Wall.northWallPosY - player1.radius;
        if (y < Wall.southWallPosY + player1.radius) player1.body.position.y = Wall.southWallPosY + player1.radius;
    }
}

function discOutOfBounds(){
    disc.body.position.z = 0;
    disc.body.velocity = new CANNON.Vec3(disc.body.velocity.x, disc.body.velocity.y, 0);
    if (disc.body.position.x < -window.innerWidth/2 || disc.body.position.x > window.innerWidth/2 || disc.body.position.y < -window.innerHeight/2 || disc.body.position.y > window.innerHeight/2) {
        setTimeout(function(){
            disc.body.position.set(0, 0, 0);
            disc.body.velocity.set(0, 0, 0);
        }, 1000);
    }
}

//loop
function animate() {
    requestAnimationFrame( animate );

    discOutOfBounds();

    //scrive posizione e rotazione dei corpi di cannon.js sulle mesh di three.js
    for (let i = 0; i !== meshes.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    world.fixedStep(1/600);

    controls.update();

    renderer.render( scene, camera );
}