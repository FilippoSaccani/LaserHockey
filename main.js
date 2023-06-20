import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import Stats from 'https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {FilmPass} from "three/addons/postprocessing/FilmPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";

let scene, renderer, camera, world, stats, composer, controls;

let mouseDeltaX = 0;
let mouseDeltaY = 0;

let meshes = [];
let bodies = [];

const deltaTime = 1 / 60;
const numSteps = 30;

//let domE = document.getElementById("canvas-placeholder");
//let width = domE.offsetWidth;
//let height = width * 9/16;

class Disc {
    height = 19;
    radius = 30;
    bodyMaterial = new CANNON.Material();
    geometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height);
    material = new THREE.MeshPhysicalMaterial({color: 0xffff00});
    mesh;
    body;
    maxVel = 1100;
    minVel = 5;
    #resetCounter = 0;
    #resetting = false;
    static goalResetTime = 2000;

    constructor() {
        this.mesh = new THREE.Mesh( this.geometry, this.material );

        this.body = new CANNON.Body({
            mass: 2,
            material: this.bodyMaterial,
            shape: new CANNON.Cylinder(this.radius, this.radius, this.height),
            position: new CANNON.Vec3(0, 0, 0)
        });

        let helperSphere = new CANNON.Sphere(this.radius);
        this.body.addShape(helperSphere);

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
            }, Disc.goalResetTime);
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
            ray.intersectBody(ltLine.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            ray.intersectBody(lbLine.body, result2)
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
            ray.intersectBody(rtLine.body, result2)
            if (result2.hasHit && result2.distance < result1.distance) return null;

            ray.intersectBody(rbLine.body, result2)
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
    angleLimit = 2;

    addPoint(){
        this.points += 1;
    }
}

class Player1 extends Player{
    invSensitivity = 2;
    constructor() {
        super();
        this.basePositionX = Wall.westWallPosX + 200;

        //three
        this.material = new THREE.MeshStandardMaterial({color: 0xff3000});

        let map = new THREE.TextureLoader().load("texture/FOTO TEAM marco.png");
        map.center = new THREE.Vector2(0.5, 0.5);
        map.anisotropy = 4;
        map.rotation = Math.PI/2;

        //this.material = new THREE.MeshBasicMaterial({map: map});
        this.mesh = new THREE.Mesh( this.geometry, this.material );

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


    move(){
        this.body.position.x += mouseDeltaX * 2.6 * (disc.body.position.distanceTo(this.body.position) / (window.innerWidth));
        this.body.position.y += -mouseDeltaY * 2.6 * (disc.body.position.distanceTo(this.body.position) / (window.innerHeight));

        mouseDeltaX = 0;
        mouseDeltaY = 0;

        this.limits();
    }
    /*
    limits(){
        //controllo dei bordi
        if (this.body.position.x >= -this.radius) this.body.position.x = -this.radius;
        if (this.body.position.x <= Wall.westWallPosX + this.radius + 5 + disc.radius/2) this.body.position.x = Wall.westWallPosX + this.radius + 5 + disc.radius/2;

        if (this.body.position.y >= Wall.northWallPosY - this.radius - 5 - disc.radius/2) this.body.position.y = Wall.northWallPosY - this.radius - 5 - disc.radius/2;
        if ( this.body.position.y <= Wall.southWallPosY + this.radius + 5 + disc.radius/2) this.body.position.y = Wall.southWallPosY + this.radius + 5 + disc.radius/2;
    }

     */


    limits(){
        if (this.body.position.x >= -this.radius) this.body.position.x = -this.radius;
        if (this.body.position.x <= Wall.westWallPosX + this.radius + 5 + disc.radius) this.body.position.x = Wall.westWallPosX + this.radius + 5 + disc.radius;

        if (this.body.position.y >= Wall.northWallPosY - this.radius - 5 - disc.radius) this.body.position.y = Wall.northWallPosY - this.radius - 5 - disc.radius;
        if ( this.body.position.y <= Wall.southWallPosY + this.radius + 5 + disc.radius) this.body.position.y = Wall.southWallPosY + this.radius + 5 + disc.radius;
    }
    /*
        move(){
            let trajectory = disc.trajectoryToTrigger1();

            //difesa
            if (trajectory && disc.body.velocity.x < - 400) this.defend(trajectory);
            else {
                //limita i loop di attacco/ritorno negli angoli
                if (this.returning > 20) this.returning = 0;

                //se il disco si trova dalla parte del giocatore uno, fuori dal campo o sta andando verso il giocatore due allora non attacca,
                // ma torna verso la sua posizione iniziale
                if (disc.body.position.x > 0 || disc.body.velocity.x > 400 || this.returning > 0 || disc.outOfBounds() || disc.resetAfterStop() || (disc.body.velocity.x > 100 && disc.body.position.x > -200)) {
                    this.return();
                }

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

         */
}

class Player2 extends Player {
    constructor() {
        super();
        this.basePositionX = Wall.eastWallPosX - 200;

        //three
        this.material = new THREE.MeshStandardMaterial({color: 0x00ffff});

        let map = new THREE.TextureLoader().load("texture/FOTO TEAM vacco.png");
        map.center = new THREE.Vector2(0.5, 0.5);
        map.rotation = Math.PI/2;
        map.anisotropy = 4;

        //this.material = new THREE.MeshBasicMaterial({map: map});
        this.mesh = new THREE.Mesh( this.geometry, this.material );

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
            if (disc.body.position.x < 0 || disc.body.velocity.x < - 400 || this.returning > 0 || disc.outOfBounds() || disc.resetAfterStop() || (disc.body.velocity.x < -100 && disc.body.position.x < 200)){
                this.return();
            }

            //altrimenti attacca
            else this.attack();
        }

        this.limits();
    }

     limits(){
        //controllo bordi
        if (this.body.position.x > Wall.eastWallPosX - this.radius - disc.radius*this.angleLimit - 5) this.body.position.x = Wall.eastWallPosX - this.radius - disc.radius*this.angleLimit - 5;
        else if (this.body.position.x < this.radius) this.body.position.x = this.radius;

        if (this.body.position.y > Wall.northWallPosY - this.radius - disc.radius*this.angleLimit - 5) this.body.position.y = Wall.northWallPosY - this.radius - disc.radius*this.angleLimit - 5;
        else if (this.body.position.y < Wall.southWallPosY + this.radius + disc.radius*this.angleLimit + 5) this.body.position.y = Wall.southWallPosY + this.radius + disc.radius*this.angleLimit + 5;
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
    static deltaFromHorizontalBorder = 100;
    static deltaFromVerticalBorder = 50;
    static radius = 10;
    static bodyMaterial = new CANNON.Material();
    mesh;
    body;
    static northWallPosY =  (window.innerHeight/2) - this.deltaFromVerticalBorder;
    static eastWallPosX = (window.innerWidth/2) - this.deltaFromHorizontalBorder;
    static southWallPosY = (-window.innerHeight/2) + this.deltaFromVerticalBorder;
    static westWallPosX = (-window.innerWidth/2) + this.deltaFromHorizontalBorder;
}

class WallAngle extends Wall{
    static angleRadius = 100;

    constructor(color, position = new CANNON.Vec3(), rotation = new CANNON.Vec3()) {
        super();

        this.body = new CANNON.Body({
            shape: CANNON.Trimesh.createTorus(WallAngle.angleRadius, Wall.radius, 10, 16, Math.PI/2),
            type: CANNON.Body.STATIC,
            material: Wall.bodyMaterial,
            position: position,
        });

        this.body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);

        this.body.position.x += WallAngle.angleRadius * -Math.sign(Math.cos(rotation.z+0.00001));
        this.body.position.y += WallAngle.angleRadius * -Math.sign(Math.sin(rotation.z+0.00001));

        this.mesh = new THREE.Mesh(
            new THREE.TorusGeometry(WallAngle.angleRadius, Wall.radius, 16, 48, Math.PI/2),
            new THREE.MeshStandardMaterial({color: color})
        );
    }
}

class WallLine extends Wall{
    length;

    constructor(color, position = new CANNON.Vec3(), rotation = new CANNON.Vec3(), length) {
        super();
        this.length = length;

        this.body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            material: Wall.bodyMaterial,
            shape: new CANNON.Cylinder(Wall.radius, Wall.radius, this.length),
            position: position
        });
        this.body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);

        this.body.position.x += (this.length/2 + WallAngle.angleRadius) * -Math.sign(this.body.position.x) * Math.sign(Math.round(Math.sin(rotation.z)));
        this.body.position.y += (this.length/2 + WallAngle.angleRadius) * -Math.sign(this.body.position.y) * Math.sign(Math.round(Math.cos(rotation.z)));

        this.mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(Wall.radius, Wall.radius, this.length),
            new THREE.MeshStandardMaterial({color: color})
        );
    }
}

class Trigger {
    body;
    mesh;
    deltaFromWall = 70;
    width = 2;
    height = window.innerHeight/2;
    depth = 2;

    constructor(position = new CANNON.Vec3()) {
        this.body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            isTrigger: true,
            shape: new CANNON.Box(new CANNON.Vec3(this.width/2, this.height/2, this.depth/2)),
            position: position
        });

        this.body.position.x += this.deltaFromWall * Math.sign(this.body.position.x);

        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.width, this.height, this.depth),
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

        this.mesh.position.set(offset, Wall.northWallPosY - this.size/2, 0);
    }

    static loadFont() {
        const fontLoader = new FontLoader();

        fontLoader.load("https://unpkg.com/three@0.153.0/examples/fonts/helvetiker_regular.typeface.json", function ( response ){
            Text.font = response;
            setScore(false);
        })
    }
}

class Light{
    mesh

    constructor() {
        this.mesh = new THREE.AmbientLight(0xffffff, 7);
    }
}

class Rings{
    group;
    radius;
    size;
    color = 0x080808;
}

class CenterRings extends Rings{
    size = 15;

    constructor(radius) {
        super();
        this.group = new THREE.Group();
        this.radius = radius;

        let ring1 = new THREE.Mesh(
            new THREE.RingGeometry(this.radius, this.radius+this.size, 32, 1),
            new THREE.MeshStandardMaterial({color: this.color})
        )
        this.group.add(ring1);

        let ring2 = new THREE.Mesh(
            new THREE.RingGeometry(this.radius+3*this.size, this.radius+4*this.size, 32, 1),
            new THREE.MeshStandardMaterial({color: this.color})
        )
        this.group.add(ring2);

        this.group.position.set(0, 0, 1);
    }
}

class GoalRings extends Rings{
    size = 10;

    constructor(x, radius) {
        super();
        this.group = new THREE.Group();
        this.radius = radius;

        let ring1 = new THREE.Mesh(
            new THREE.RingGeometry(this.radius, this.radius+this.size, 32, 1, 0, Math.PI),
            new THREE.MeshStandardMaterial({color: this.color})
        )
        ring1.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI/2*Math.sign(x)));
        this.group.add(ring1);

        let ring2 = new THREE.Mesh(
            new THREE.RingGeometry(this.radius+3*this.size, this.radius+4*this.size, 32, 1, 0, Math.PI),
            new THREE.MeshStandardMaterial({color: this.color})
        )
        ring2.quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI/2*Math.sign(x)));
        this.group.add(ring2);

        this.group.position.set(x, 0, 1);
    }

    glow(){
        let t = this;
        this.group.children.forEach(function(mesh) {
            mesh.material.color.setHex( 0xf0f0f0 );
            setTimeout(function () {
                mesh.material.color.setHex(t.color);
            }, Disc.goalResetTime);
        })
    }
}

Text.loadFont();

let goalSize = window.innerHeight/3.5;
let topHorizontalWallLength = window.innerWidth/2 - 5*Wall.deltaFromVerticalBorder - WallAngle.angleRadius;
let bottomHorizontalWallLength = window.innerWidth/2 - 2*Wall.deltaFromVerticalBorder - WallAngle.angleRadius;
let verticalWallLength = window.innerHeight/2 - Wall.deltaFromVerticalBorder - WallAngle.angleRadius - goalSize/2;
let scoreWallLength = 7*Wall.deltaFromVerticalBorder;

let centerRings = new CenterRings(goalSize/1.5);
let rightGoalRings = new GoalRings(Wall.eastWallPosX, goalSize/2);
let leftGoalRings = new GoalRings(Wall.westWallPosX, goalSize/2);

//muri sopra
let ltLine = new WallLine(0xff0000, new CANNON.Vec3(Wall.westWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, 0), verticalWallLength);
meshes.push(ltLine.mesh);
bodies.push(ltLine.body);

let tl = new WallAngle(0xff0000, new CANNON.Vec3(Wall.westWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2));
meshes.push(tl.mesh);
bodies.push(tl.body);

let tlLine = new WallLine(0xff0000, new CANNON.Vec3(Wall.westWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2), topHorizontalWallLength);
meshes.push(tlLine.mesh);
bodies.push(tlLine.body);

let trLine = new WallLine(0x00ff00, new CANNON.Vec3(Wall.eastWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2), topHorizontalWallLength);
meshes.push(trLine.mesh);
bodies.push(trLine.body);

let scoreLine = new WallLine(0x000000, new CANNON.Vec3(0, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2), scoreWallLength)
meshes.push(scoreLine.mesh);
bodies.push(scoreLine.body);

let tr = new WallAngle(0x00ff00, new CANNON.Vec3(Wall.eastWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, 0));
meshes.push(tr.mesh);
bodies.push(tr.body);

let rtLine = new WallLine(0x00ff00, new CANNON.Vec3(Wall.eastWallPosX, Wall.northWallPosY, 0), new CANNON.Vec3(0, 0, 0), verticalWallLength);
meshes.push(rtLine.mesh);
bodies.push(rtLine.body);

//muri sotto
let rbLine = new WallLine(0x0000ff, new CANNON.Vec3(Wall.eastWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, 0), verticalWallLength);
meshes.push(rbLine.mesh);
bodies.push(rbLine.body);

let br = new WallAngle(0x0000ff, new CANNON.Vec3(Wall.eastWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, 3*Math.PI/2));
meshes.push(br.mesh);
bodies.push(br.body);

let brLine = new WallLine(0x0000ff, new CANNON.Vec3(Wall.eastWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2), bottomHorizontalWallLength);
meshes.push(brLine.mesh);
bodies.push(brLine.body);

let blLine = new WallLine(0xffff00, new CANNON.Vec3(Wall.westWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI/2), bottomHorizontalWallLength);
meshes.push(blLine.mesh);
bodies.push(blLine.body);

let bl = new WallAngle(0xffff00, new CANNON.Vec3(Wall.westWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, Math.PI));
meshes.push(bl.mesh);
bodies.push(bl.body);

let lbLine = new WallLine(0xffff00, new CANNON.Vec3(Wall.westWallPosX, Wall.southWallPosY, 0), new CANNON.Vec3(0, 0, 0), verticalWallLength);
meshes.push(lbLine.mesh);
bodies.push(lbLine.body);

let ltGoalLine = new WallLine(0x00ffff, new CANNON.Vec3(-window.innerWidth/2 - scoreWallLength, goalSize/2 + Wall.radius, 0), new CANNON.Vec3(0, 0, Math.PI/2), scoreWallLength)
meshes.push(ltGoalLine.mesh);
bodies.push(ltGoalLine.body);

let lbGoalLine = new WallLine(0x00ffff, new CANNON.Vec3(-window.innerWidth/2 - scoreWallLength, -goalSize/2 - Wall.radius, 0), new CANNON.Vec3(0, 0, Math.PI/2), scoreWallLength)
meshes.push(lbGoalLine.mesh);
bodies.push(lbGoalLine.body);

let rtGoalLine = new WallLine(0xff3000, new CANNON.Vec3(window.innerWidth/2 + scoreWallLength, goalSize/2 + Wall.radius, 0), new CANNON.Vec3(0, 0, Math.PI/2), scoreWallLength)
meshes.push(rtGoalLine.mesh);
bodies.push(rtGoalLine.body);

let rbGoalLine = new WallLine(0xff3000, new CANNON.Vec3(window.innerWidth/2 + scoreWallLength, -goalSize/2 - Wall.radius, 0), new CANNON.Vec3(0, 0, Math.PI/2), scoreWallLength)
meshes.push(rbGoalLine.mesh);
bodies.push(rbGoalLine.body);

let trigger1 = new Trigger(new CANNON.Vec3(Wall.westWallPosX, 0, 0));

let trigger2 = new Trigger(new CANNON.Vec3(Wall.eastWallPosX, 0, 0));

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

function initThree() {
    //scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );


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
    renderer.shadowMap.enabled = false;

    composer = new EffectComposer( renderer );

    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    const bloomPass = new UnrealBloomPass(1000, 0.2);
    composer.addPass( bloomPass );

    const filmPass = new FilmPass(0.8, 0.1, 1000, 0);
    composer.addPass( filmPass );

    //piano di sfondo
    const planeGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    const planeMaterial = new THREE.MeshPhysicalMaterial({color: 0x000000});
    const plane = new THREE.Mesh( planeGeometry, planeMaterial );
    scene.add(plane);

    //aggiunge tutte le mesh create in precedenza
    meshes.forEach(function (mesh) {
        scene.add(mesh);
    });

    scene.add(score.mesh);
    scene.add(light.mesh);

    scene.add(centerRings.group);
    scene.add(rightGoalRings.group);
    scene.add(leftGoalRings.group);

    stats = new Stats()
    document.body.appendChild(stats.dom)

    //controls = new OrbitControls( camera, renderer.domElement );

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

let scoreSetTimeout = null;
function setScore(set = true) {
    scene.remove(score.mesh);
    score = new Text(player1.points + " - " + player2.points);
    scene.add(score.mesh);

    if (set) {
        scoreSetTimeout = setTimeout(function () {
            scoreSetTimeout = null;
        }, 100)
    }
}

trigger1.body.addEventListener('collide', function () {
    if (scoreSetTimeout === null) {
        player2.addPoint();
        setScore();
        leftGoalRings.glow();
    }
});

trigger2.body.addEventListener('collide', function () {
    if (scoreSetTimeout === null) {
        player1.addPoint();
        setScore();
        rightGoalRings.glow();
    }
});

renderer.domElement.onmousemove = function(event) {
    mouseDeltaX = event.movementX;
    mouseDeltaY = event.movementY;
}

renderer.domElement.onclick =  () => {
    renderer.domElement.requestPointerLock({
        unadjustedMovement: true
    });
}

function animate() {
    requestAnimationFrame( animate );

    player1.move();
    player2.move();

    disc.outOfBounds();
    disc.resetAfterStop();

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
    //controls.update();
}