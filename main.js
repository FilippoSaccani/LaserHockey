import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

let scene, renderer, camera, world, controls;
let mouseX = 0;
let mouseY = 0;

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
    maxVel = 1000;

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
        this.body.linearDamping = 0.2;
    }

    outOfBounds(){
        let t = this;
        this.body.position.z = 0;
        this.body.velocity = new CANNON.Vec3(this.body.velocity.x, this.body.velocity.y, 0);

        if (this.body.position.x < -window.innerWidth/2 || this.body.position.x > window.innerWidth/2 || this.body.position.y < -window.innerHeight/2 || this.body.position.y > window.innerHeight/2) {
            setTimeout(function(){
                t.body.position.set(0, 0, 0);
                t.body.velocity.set(0, 0, 0);
                //t.body.applyImpulse(new CANNON.Vec3(1000, 0, 0));
            }, 1000);
            return true;
        }
        return false;
    }


    trajectoryToTrigger2(){
        let to = new CANNON.Vec3(this.body.velocity.x * window.innerWidth, this.body.velocity.y * window.innerHeight, 0);

        let dir = new THREE.Vector3(this.body.velocity.x, this.body.velocity.y, 0);
        dir.normalize();

        let ray = new CANNON.Ray(disc.body.position, to);
        ray.direction = new CANNON.Vec3(dir.x, dir.y, 0);

        let result = new CANNON.RaycastResult();
        ray.intersectBody(trigger2.body, result);

        if (result.hasHit) {
            let m, q;

            //coefficente angolare di una retta passante per due punti
            m = Math.atan2(dir.y, dir.x);

            q = this.body.position.y - this.body.position.x*m;

            //restituisce i parametri della retta della traiettoria
            return new THREE.Vector2(m, q);
        }

        return null;
    }

    maxVelocity() {
        if (this.body.velocity.x > this.maxVel) this.body.velocity.x = this.maxVel * Math.sign(this.body.velocity.x);
        if (this.body.velocity.y > this.maxVel) this.body.velocity.y = this.maxVel * Math.sign(this.body.velocity.y);
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
    basePositionX;

    addPoint(amount){
        this.points += amount;
    }
}

class Player1 extends Player{
    speed = 7
    constructor() {
        super();
        this.basePositionX = Wall.westWallPosX + 200;

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
            position: new CANNON.Vec3(this.basePositionX, 0, 0),
            type: CANNON.Body.KINEMATIC,
        });

        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
    }

    move(){
        let x = this.body.position.x;
        let y = this.body.position.y;


        x += (mouseX - this.body.position.x)/this.speed;
        y += (mouseY - this.body.position.y)/this.speed;


        //controllo dei bordi
        if (x < -player1.radius && x > Wall.westWallPosX + player1.radius + 5) player1.body.position.x = x;
        else {
            if (x >= -player1.radius) player1.body.position.x = -player1.radius;
            if (x <= Wall.westWallPosX + player1.radius + 5) player1.body.position.x = Wall.westWallPosX + player1.radius + 5;
        }

        if (y < Wall.northWallPosY - player1.radius - 5 && y  > Wall.southWallPosY + player1.radius + 5) player1.body.position.y = y;
        else {
            if (y >= Wall.northWallPosY - player1.radius - 5) player1.body.position.y = Wall.northWallPosY - player1.radius - 5;
            if (y <= Wall.southWallPosY + player1.radius + 5) player1.body.position.y = Wall.southWallPosY + player1.radius + 5;
        }
    }
}

class Player2 extends Player {
    defendSpeed = 20;
    attackSpeed = 10;
    returnSpeed = 40;

    constructor() {
        super();
        this.basePositionX = Wall.eastWallPosX - 200;

        //three
        this.material = new THREE.MeshPhysicalMaterial({color: 0x0000ff});
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;

        //cannon
        this.body = new CANNON.Body({
            mass: 5,
            material: Player.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.depth),
            position: new CANNON.Vec3(this.basePositionX, 0, 0),
            type: CANNON.Body.KINEMATIC
        });

        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
    }

    move(){
        let trajectory = disc.trajectoryToTrigger2();
        let position = this.body.position;


        if (trajectory) {       //difesa
            //punto della linea più vicino al giocatore
            let intersectionX, intersectionY;

            if (trajectory.x === 0) {
                intersectionX = position.x;
                intersectionY = trajectory.y;
            }
            else {
                let m2 = -1/trajectory.x;
                let q2 = position.y - position.x*m2;

                intersectionX = (q2 - trajectory.y)/(trajectory.x - m2);
                intersectionY = m2 * intersectionX + q2;
            }

            position.x += (intersectionX - position.x)/this.defendSpeed + 10;
            position.y += (intersectionY - position.y)/this.defendSpeed;
        }
        else {
            if (disc.body.position.x <= 0 || disc.outOfBounds()) {    //se il disco si trova dalla parte del giocatore 1 o fuori dal campo allora non attacca, ma torna verso la sua posizione iniziale
                position.x += (this.basePositionX - position.x)/this.returnSpeed;
                position.y += (-position.y)/this.returnSpeed;
            }
            else {  //altrimenti attacca
                if (disc.body.position.x > position.x) position.x += Math.abs(disc.body.position.x - position.x)/this.defendSpeed;
                else position.x += (disc.body.position.x - position.x - disc.radius)/this.attackSpeed;
                position.y += (disc.body.position.y - position.y - disc.radius)/this.attackSpeed;
            }
        }


        //controllo bordi
        if (position.x > Wall.eastWallPosX - this.radius - disc.radius/1.5 - 5) position.x = Wall.eastWallPosX - this.radius - disc.radius/1.5 - 5;
        else if (position.x < this.radius) position.x = this.radius;

        if (position.y > Wall.northWallPosY - this.radius - disc.radius/1.5 - 5) position.y = Wall.northWallPosY - this.radius - disc.radius/1.5 - 5;
        else if (position.y < Wall.southWallPosY + this.radius + disc.radius/1.5 + 5) position.y = Wall.southWallPosY + this.radius + disc.radius/1.5 + 5;
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
    mesh;
    deltaFromWall = 300;
    constructor(wall = new VerticalWall()) {
        let x

        if (wall.body.position.x < 0) x = wall.body.position.x - 60;
        else x = wall.body.position.x + 60;

        this.body = new CANNON.Body({
            isTrigger: true,
            shape: new CANNON.Box(new CANNON.Vec3(wall.width/2, (wall.height+this.deltaFromWall)/2, wall.depth/2)),
            position: new CANNON.Vec3(x, 0, 0)
        });

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(wall.width, wall.height+this.deltaFromWall, wall.depth),
            new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true})
        );
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

        fontLoader.load("node_modules/three/examples/fonts/helvetiker_bold.typeface.json", function ( response ){
            Text.font = response;
        })
    }
}

class Light{
    mesh
    constructor() {
        this.mesh = new THREE.PointLight(0xffffff, 100, 1000);

        this.mesh.castShadow = true;

        this.mesh.shadow.mapSize.width = 2048;
        this.mesh.shadow.mapSize.height = 2048;
        this.mesh.shadow.camera.near = 0.5;
        this.mesh.shadow.camera.far = 1000;
        this.mesh.shadow.bias = 0.0000001;

        this.mesh.position.set(0, 0, 150);
    }
}

Text.loadFont();
mouseX = Wall.westWallPosX + 200;

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

    //controls = new OrbitControls( camera, renderer.domElement );


    window.onresize = update;
}

function initCannon() {
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, 0, 0)
    });

    world.quatNormalizeFast = false;
    world.quatNormalizeSkip = 0;

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
    setScore();
})

trigger2.body.addEventListener('collide', function () {
    player1.addPoint(0.5);
    setScore();
})

renderer.domElement.onmousemove = function(event) {
    mouseX = screenXToCartesian( event.x );
    mouseY = screenYToCartesian( event.y );
}

function animate() {
    requestAnimationFrame( animate );

    disc.outOfBounds();
    disc.maxVelocity();

    player1.move();
    player2.move();

    //scrive posizione e rotazione dei corpi di cannon.js sulle mesh di three.js
    for (let i = 0; i !== meshes.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    world.fixedStep(1/600);

    //controls.update();

    renderer.render( scene, camera );
}