import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import Stats from 'https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {FilmPass} from "three/addons/postprocessing/FilmPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

let scene, renderer, camera, world, stats, composer, controls;
let mouseDeltaX = 0;
let mouseDeltaY = 0;

let meshes = [];
let bodies = [];

class Disc {
    height = 19;
    radius = 30;
    bodyMaterial = new CANNON.Material();
    geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
    material = new THREE.MeshPhysicalMaterial({color: 0xffff00});
    mesh;
    body;
    maxVel = 1500;
    minVel = 10;
    #resetCounter = 0;
    #resetting = false;

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
        this.body.linearFactor = new CANNON.Vec3(1, 1, 0);
    }

    outOfBounds(){
        let t = this;

        if (!this.#resetting && (this.body.position.x < -window.innerWidth/2 || this.body.position.x > window.innerWidth/2 || this.body.position.y < -window.innerHeight/2 || this.body.position.y > window.innerHeight/2)) {
            this.#resetting = true;
            setTimeout(function(){
                t.#resetting = false;
                t.reset();
            }, 1000);
        }
        return this.#resetting;
    }

    resetAfterStop() {
        if (this.body.position.x === 0 && this.body.position.y === 0) return false;
        else {
            if (Math.abs(this.body.velocity.x) < this.minVel && Math.abs(this.body.velocity.y) < this.minVel) {
                this.#resetCounter++;
                if (this.#resetCounter === 200) this.reset();
                return true;
            }
            this.#resetCounter = 0;
        }

        return false;
    }

    reset(){
        this.body.position.set(0, 0, 0);
        this.body.velocity.set(0, 0, 0);
    }

    trajectoryToTrigger1(){
        let ray = this.trajectoryRay(window.innerWidth);
        ray.mode = CANNON.Ray.CLOSEST;

        let result1 = new CANNON.RaycastResult();
        let result2 = new CANNON.RaycastResult();

        ray.intersectBody(trigger1.body, result1);

        if (result1.hasHit) {
            ray.intersectBody(northWestWall.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            ray.intersectBody(southWestWall.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            let m, q;

            //coefficiente angolare di una retta passante per due punti
            m = Math.atan2(ray.direction.y, ray.direction.x);
            m = Math.tan(m);

            q = this.body.position.y - this.body.position.x*m;

            //restituisce i parametri della retta della traiettoria
            return new THREE.Vector2(m, q);
        }
        return null;
    }

    trajectoryToTrigger2(){
        let ray = this.trajectoryRay(window.innerWidth);
        ray.mode = CANNON.Ray.CLOSEST;

        let result1 = new CANNON.RaycastResult();
        let result2 = new CANNON.RaycastResult();

        ray.intersectBody(trigger2.body, result1);

        if (result1.hasHit) {
            ray.intersectBody(northEastWall.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            ray.intersectBody(southEastWall.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            let m, q;

            //coefficiente angolare di una retta passante per due punti
            m = Math.atan2(ray.direction.y, ray.direction.x);
            m = Math.tan(m);

            q = this.body.position.y - this.body.position.x*m;

            //restituisce i parametri della retta della traiettoria
            return new THREE.Vector2(m, q);
        }
        return null;
    }

    maxVelocity() {
        if (Math.abs(this.body.velocity.x) > this.maxVel) this.body.velocity.x = this.maxVel * Math.sign(this.body.velocity.x);
        if (Math.abs(this.body.velocity.y) > this.maxVel) this.body.velocity.y = this.maxVel * Math.sign(this.body.velocity.y);
    }

    trajectoryRay(length){
        let position = this.body.position.clone();

        let direction = this.body.velocity.clone();
        direction.normalize();

        let rayEnd = position.clone().vadd(direction.scale(length));

        return new CANNON.Ray(position, rayEnd);
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
    defendSpeed = 20;
    attackSpeed = 10;
    returnSpeed = 30;
    returning = 0;

    addPoint(amount){
        this.points += amount;
    }
}

class Player1 extends Player{
    constructor() {
        super();
        this.basePositionX = Wall.westWallPosX + 200;

        //three
        this.material = new THREE.MeshStandardMaterial({color: 0xff0000});

        let map = new THREE.TextureLoader().load("texture/FOTO TEAM marco.png");
        map.center = new THREE.Vector2(0.5, 0.5);
        map.anisotropy = 4;
        map.rotation = Math.PI/2;

        //this.material = new THREE.MeshBasicMaterial({map: map});
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        //cannon
        this.body = new CANNON.Body({
            mass: 100,
            material: Player.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.depth),
            position: new CANNON.Vec3(this.basePositionX, 0, 0),
            type: CANNON.Body.KINEMATIC,
        });

        this.body.quaternion.setFromEuler(Math.PI/2, 0, 0);
    }

    /*
    move(){
        this.body.position.x += mouseDeltaX/2;
        this.body.position.y += -mouseDeltaY/2;

        mouseDeltaX = 0;
        mouseDeltaY = 0;

        this.limits();
    }

    limits(){
        //controllo dei bordi
        if (this.body.position.x >= -this.radius) this.body.position.x = -this.radius;
        if (this.body.position.x <= Wall.westWallPosX + this.radius + 5 + disc.radius/2) this.body.position.x = Wall.westWallPosX + this.radius + 5 + disc.radius/2;

        if (this.body.position.y >= Wall.northWallPosY - this.radius - 5 - disc.radius/2) this.body.position.y = Wall.northWallPosY - this.radius - 5 - disc.radius/2;
        if ( this.body.position.y <= Wall.southWallPosY + this.radius + 5 + disc.radius/2) this.body.position.y = Wall.southWallPosY + this.radius + 5 + disc.radius/2;
    }
     */

    limits(){
        let angleLimit = 1.06;

        if (this.body.position.x >= -this.radius) this.body.position.x = -this.radius;
        if (this.body.position.x <= Wall.westWallPosX + this.radius + 5 + disc.radius*angleLimit) this.body.position.x = Wall.westWallPosX + this.radius + 5 + disc.radius*angleLimit;

        if (this.body.position.y >= Wall.northWallPosY - this.radius - 5 - disc.radius*angleLimit) this.body.position.y = Wall.northWallPosY - this.radius - 5 - disc.radius*angleLimit;
        if ( this.body.position.y <= Wall.southWallPosY + this.radius + 5 + disc.radius*angleLimit) this.body.position.y = Wall.southWallPosY + this.radius + 5 + disc.radius*angleLimit;
    }

    move(){
        let trajectory = disc.trajectoryToTrigger1();

        //difesa
        if (trajectory && disc.body.velocity.x < - 400) this.defend(trajectory);
        else {
            //limita i loop di attacco/ritorno negli angoli
            if (this.returning > 20) this.returning = 0;

            //se il disco si trova dalla parte del giocatore uno, fuori dal campo o sta andando verso il giocatore due allora non attacca,
            // ma torna verso la sua posizione iniziale
            if (disc.body.position.x > 0 || disc.body.velocity.x > 400 || this.returning > 0 || disc.outOfBounds() || disc.resetAfterStop()) this.return();

            //altrimenti attacca
            else this.attack();
        }

        this.limits();
    }

    defend(trajectory){
        let intersectionX, intersectionY;

        //punto della linea più vicino al giocatore
        if (trajectory.x === 0) {
            intersectionX = this.body.position.x;
            intersectionY = trajectory.y;
        }
        else {
            let m2 = -1/trajectory.x;
            let q2 = this.body.position.y - this.body.position.x*m2;

            intersectionX = (q2 - trajectory.y)/(trajectory.x - m2);
            intersectionY = m2 * intersectionX + q2;
        }

        this.body.position.x += (intersectionX - this.body.position.x)/this.defendSpeed - 10;
        this.body.position.y += (intersectionY - this.body.position.y)/this.defendSpeed;
    }

    attack(){
        this.body.position.x += (disc.body.position.x - this.body.position.x)/(this.attackSpeed);
        this.body.position.y += (disc.body.position.y - this.body.position.y)/(this.attackSpeed);
    }

    return(){
        this.returning++;
        this.body.position.x += (this.basePositionX - this.body.position.x)/this.returnSpeed;
        this.body.position.y += (-this.body.position.y)/this.returnSpeed;
    }
}

class Player2 extends Player {
    constructor() {
        super();
        this.basePositionX = Wall.eastWallPosX - 200;

        //three
        this.material = new THREE.MeshStandardMaterial({color: 0x0000ff});

        let map = new THREE.TextureLoader().load("texture/FOTO TEAM vacco.png");
        map.center = new THREE.Vector2(0.5, 0.5);
        map.rotation = Math.PI/2;
        map.anisotropy = 4;

        //this.material = new THREE.MeshBasicMaterial({map: map});
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

        //difesa
        if (trajectory && disc.body.velocity.x > 400) this.defend(trajectory);
        else {
            //limita i loop di attacco/ritorno negli angoli
            if (this.returning > 20) this.returning = 0;

            //se il disco si trova dalla parte del giocatore uno, fuori dal campo o sta andando verso il giocatore uno allora non attacca,
            // ma torna verso la sua posizione iniziale
            if (disc.body.position.x < 0 || disc.body.velocity.x < - 400 || this.returning > 0 || disc.outOfBounds() || disc.resetAfterStop()) this.return();

            //altrimenti attacca
            else this.attack();
        }

        this.limits();
    }

     limits(){
        let angleLimit = 1.06;

        //controllo bordi
        if (this.body.position.x > Wall.eastWallPosX - this.radius - disc.radius*angleLimit - 5) this.body.position.x = Wall.eastWallPosX - this.radius - disc.radius*angleLimit - 5;
        else if (this.body.position.x < this.radius) this.body.position.x = this.radius;

        if (this.body.position.y > Wall.northWallPosY - this.radius - disc.radius*angleLimit - 5) this.body.position.y = Wall.northWallPosY - this.radius - disc.radius*angleLimit - 5;
        else if (this.body.position.y < Wall.southWallPosY + this.radius + disc.radius*angleLimit + 5) this.body.position.y = Wall.southWallPosY + this.radius + disc.radius*angleLimit + 5;
    }

    defend(trajectory){
        let intersectionX, intersectionY;

        //punto della linea più vicino al giocatore
        if (trajectory.x === 0) {
            intersectionX = this.body.position.x;
            intersectionY = trajectory.y;
        }
        else {
            let m2 = -1/trajectory.x;
            let q2 = this.body.position.y - this.body.position.x*m2;

            intersectionX = (q2 - trajectory.y)/(trajectory.x - m2);
            intersectionY = m2 * intersectionX + q2;
        }

        this.body.position.x += (intersectionX - this.body.position.x)/this.defendSpeed + 10;
        this.body.position.y += (intersectionY - this.body.position.y)/this.defendSpeed;
    }

    attack(){
        this.body.position.x += (disc.body.position.x - this.body.position.x)/(this.attackSpeed);
        this.body.position.y += (disc.body.position.y - this.body.position.y)/(this.attackSpeed);
    }

    return(){
        this.returning++;
        this.body.position.x += (this.basePositionX - this.body.position.x)/this.returnSpeed;
        this.body.position.y += (-this.body.position.y)/this.returnSpeed;
    }
}

class Wall {
    material = new THREE.MeshPhysicalMaterial({color: 0x00ffff});
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
            type: CANNON.Body.STATIC,
            isTrigger: true,
            shape: new CANNON.Box(new CANNON.Vec3(4*wall.width/2, (wall.height+this.deltaFromWall)/2, wall.depth/2)),
            position: new CANNON.Vec3(x, 0, 0),
            collisionResponse: true
        });

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(4*wall.width, wall.height+this.deltaFromWall, wall.depth),
            new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true})
        );
    }
}

class Text {
    materials = [
        new THREE.MeshPhysicalMaterial({color: 0xffffff}), // front
        new THREE.MeshPhysicalMaterial({color: 0xa0a0a0}), // side
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

        this.mesh.position.set(offset, Wall.northWallPosY, 0);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
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
        this.mesh = new THREE.AmbientLight(0xffffff, 8);
    }
}

class BorderAngle extends THREE.Curve {
    static radius = 10;
    position = new THREE.Vector3;

    constructor( scale = 1, position = new THREE.Vector3(0, 0, 0)) {
        super();
        this.scale = scale;
        this.position = position.clone();
    }

    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const tx = BorderAngle.radius * t
        const ty = Math.sqrt(BorderAngle.radius**2 - tx**2);            //errore con il posizionamento: a volte viene l'argomento negativo e si fotte
        const tz = 0;

        console.log(optionalTarget.set( tx, ty, tz ).multiplyScalar(this.scale));

        return optionalTarget.set( tx, ty, tz ).multiplyScalar(this.scale);
    }
}

class Border {
    mesh;
    radius = 10;

    constructor() {
        let borderCurvePath = new THREE.CurvePath();

        let tlCurve = new BorderAngle(10, new THREE.Vector3(Wall.westWallPosX, Wall.northWallPosY, 0));
        borderCurvePath.add(tlCurve);

        //let topCurve = new THREE.LineCurve3(new THREE.Vector3(Wall.westWallPosX + BorderAngle.radius, Wall.northWallPosY, 0), new THREE.Vector3(-100, Wall.northWallPosY, 0));
        //borderCurvePath.add(topCurve);


        let tlGeometry = new THREE.TubeGeometry(borderCurvePath, 100, this.radius, 100);
        let tlMaterial = new THREE.MeshPhysicalMaterial({color: 0xff0000});

        this.mesh = new THREE.Mesh( tlGeometry, tlMaterial );
    }
}

Text.loadFont();

let border = new Border();

let northWall = new HorizontalWall();
northWall.body.position.set(0, Wall.northWallPosY, 0);
// meshes.push(northWall.mesh);
// bodies.push(northWall.body);

let northEastWall = new VerticalWall();
northEastWall.body.position.set(Wall.eastWallPosX, northEastWall.height, 0);
// meshes.push(northEastWall.mesh);
// bodies.push(northEastWall.body);

let southEastWall = new VerticalWall();
southEastWall.body.position.set(Wall.eastWallPosX, -northEastWall.height, 0);
// meshes.push(southEastWall.mesh);
// bodies.push(southEastWall.body);

let southWall = new HorizontalWall();
southWall.body.position.set(0, Wall.southWallPosY, 0);
// meshes.push(southWall.mesh);
// bodies.push(southWall.body);

let southWestWall = new VerticalWall();
southWestWall.body.position.set(Wall.westWallPosX, -southWestWall.height, 0);
// meshes.push(southWestWall.mesh);
// bodies.push(southWestWall.body);

let northWestWall = new VerticalWall();
northWestWall.body.position.set(Wall.westWallPosX, southWestWall.height, 0);
// meshes.push(northWestWall.mesh);
// bodies.push(northWestWall.body);

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

const deltaTime = 1 / 60;
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
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
    camera.near = 0;
    camera.far = 3000;


    //renderizzatore
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild( renderer.domElement );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    composer = new EffectComposer( renderer );

    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    const filmPass = new FilmPass(0.8, 0.05, 1000, 0);
    composer.addPass( filmPass );

    const bloomPass = new UnrealBloomPass(1000, 0.2);
    composer.addPass( bloomPass );

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
    scene.add(border.mesh)

    stats = new Stats()
    document.body.appendChild(stats.dom)

    controls = new OrbitControls( camera, renderer.domElement );

    window.onresize = update;
}

function initCannon() {
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, 0, 0)
    });

    //ottimizzazioni per migliorare le collisioni
    world.quatNormalizeFast = false;
    world.quatNormalizeSkip = 0;

    world.addBody(trigger1.body);
    world.addBody(trigger2.body);


    bodies.forEach(function( body ){
        world.addBody(body);
    });


    //proprietà del contatto tra oggetti diversi:
    const wall_disc = new CANNON.ContactMaterial(Wall.bodyMaterial, disc.bodyMaterial, {
        friction: 1,
        restitution: 1.2
    });

    const player_disc = new CANNON.ContactMaterial(Player.bodyMaterial, disc.bodyMaterial, {
        friction: 1,
        restitution: 0
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
});

trigger2.body.addEventListener('collide', function () {
    player1.addPoint(0.5);
    setScore();
});

renderer.domElement.onmousemove = function(event) {
    mouseDeltaX = event.movementX;
    mouseDeltaY = event.movementY;
}

renderer.domElement.onclick = function(event) {
    //renderer.domElement.requestPointerLock();
}

console.clear();

function animate() {
    requestAnimationFrame( animate );

    player1.move();
    player2.move();

    disc.outOfBounds();
    disc.resetAfterStop();

    let numSteps = 10;
    const subDeltaTime = deltaTime / numSteps;

    for (let i = 0; i < numSteps; i++) {
        disc.maxVelocity();

        world.step(subDeltaTime);
    }

    //scrive posizione e rotazione dei corpi di cannon.js sulle mesh di three.js
    for (let i = 0; i !== bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }

    composer.render();
    stats.update();
    controls.update();
}