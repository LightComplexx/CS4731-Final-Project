"use strict"; // Disallow unsafe behavior like using uninitialized variables

// WebGL globals
let canvas;
let gl;
let program;

let vPosition;  // Vertex position attribute
let vNormal;    // Normals position attribute

let cameraPos = 0.0;

let ballZ = 0.0;
let ballSpeed = 0.01;

let bPadZ = 2.0;
let bPadSpeed = 0.005;
let move_bPad = false;

let rPadZ = 2.0;
let rPadSpeed = 0.005;
let move_rPad = false;

// Model variables
// + Vertex position buffers for each
let pad_b;
let pad_b_buffers;

let pad_r;
let pad_r_buffers;

let ball;
let ball_buffers;

let table;
let table_buffers;

// Skybox variables
let vTexCoord;
let skyTexture;
let skyPositionBuffer;
let skyTexCoordBuffer;

// set mirrorbuffers
let mirrorBuffers = null;

// mirror constants 

// mirror x 
const MX = -1.0;   

// mirror z
const MZ_MIN = -1.0;   
const MZ_MAX = 1.0;   

// mirror y
const MY_BOT = 1.366; 
const MY_TOP = 2.166; 

// delta x
const REFLECT_DX = -1.296; 

function configureTexture(image) {
    skyTexture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.uniform1i(gl.getUniformLocation(program, "skyMap"), 0);
}

function createSkyBackground() {

    let skyVertices = [
        vec4(-25.0,  10.0, -15.0, 1.0),
        vec4(-25.0,  10.0,  15.0, 1.0),
        vec4(-25.0, -10.0,  15.0, 1.0),
        vec4(-25.0,  10.0, -15.0, 1.0),
        vec4(-25.0, -10.0,  15.0, 1.0),
        vec4(-25.0, -10.0, -15.0, 1.0)
    ];

    let skyTexCoords = [
        vec2(0.0,1.0),
        vec2(1.0,1.0),
        vec2(1.0,0.0),
        vec2(0.0,1.0),
        vec2(1.0,0.0),
        vec2(0.0,0.0)
    ];

    skyPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(skyVertices), gl.STATIC_DRAW);

    skyTexCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(skyTexCoords), gl.STATIC_DRAW);
}

function main() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);

    //Check that the return value is not null.
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    vTexCoord = gl.getAttribLocation(program, "vTexCoord");

    createSkyBackground();
    let image = new Image();
    image.crossOrigin = "";
    image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/July_night_sky_%2835972569256%29.jpg/960px-July_night_sky_%2835972569256%29.jpg";  
    image.onload = function() {
        configureTexture(image);
    };

    gl.uniform1i(gl.getUniformLocation(program, "skyMap"), 0);

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

    // Get vertex attribute locations from shader
    vPosition = gl.getAttribLocation(program, "vPosition");
    vNormal = gl.getAttribLocation(program, "vNormal");

    // Create project matrix
    let projMatrix = perspective(40, 1, 0.1, 200);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projMatrix'), false, flatten(projMatrix));

    // eye coordinate
    let lightPosition = vec4(2.0, 4.0, 2.0, 1.0);;
    let lightAmbient  = vec4(0.5, 0.5, 0.5, 1.0);
    let lightDiffuse  = vec4(1.0, 1.0, 1.0, 1.0);
    let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "lightSpecular"), flatten(lightSpecular));

    let vAmbient = vec4(0.4, 0.4, 0.4, 1.0);
    let shininess = 40.0;
    gl.uniform4fv(gl.getUniformLocation(program, "vAmbient"), flatten(vAmbient));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), shininess);

    // Get blue paddle
    pad_b = new Model(
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/paddle_blue.obj",
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/paddle_blue.mtl");

    // Get red paddle
    pad_r = new Model(
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/paddle_red.obj",
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/paddle_red.mtl");

    // Get ball
    ball = new Model(
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/ball.obj",
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/ball.mtl");

    // Get table
    table = new Model(
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/pong_table.obj",
        "https://raw.githubusercontent.com/LightComplexx/CS4731-Final-Project/refs/heads/main/obj/pong_table.mtl");

    // Waits for model buffers to be built
    // before rendering
    waitForModels();
}

// Builds model buffers then calls render()
function waitForModels() {
    if (!table_buffers && table.objParsed && table.mtlParsed)
        table_buffers = buildModelBuffers(table);

    if (!pad_b_buffers && pad_b.objParsed && pad_b.mtlParsed)
        pad_b_buffers = buildModelBuffers(pad_b);

    if (!pad_r_buffers && pad_r.objParsed && pad_r.mtlParsed)
        pad_r_buffers = buildModelBuffers(pad_r);

    if (!ball_buffers && ball.objParsed && ball.mtlParsed)
        ball_buffers = buildModelBuffers(ball);

    if(table_buffers && pad_r_buffers && pad_b_buffers && ball_buffers) {
        mirrorBuffers = buildMirrorBuffers();
        render();
    }
    else {
        // Loop back if all buffers aren't ready
        requestAnimationFrame(waitForModels);
    }
}

function drawSky() {
    gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 1);
    gl.disable(gl.DEPTH_TEST);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyPositionBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyTexCoordBuffer);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    let skyMatrix = mat4();
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelMatrix"), false, flatten(skyMatrix));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1i(gl.getUniformLocation(program, "isSkybox"), 0);
}

function render() {
    // Check for paddle trigger
    padTrigger();

    // Calculate object movements
    calcObjectMovements();

    // Create view matrix
    let viewMatrix = lookAt(
        vec3(6.0, 4.0, 0.0),    // camera position
        vec3(0.0, 0.0, 0.0),    // look at center
        vec3(0.0, 1.0, 0.0)     // up
    );
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewMatrix'), false, flatten(viewMatrix));

    // spotlight on the ball (following it)
    let lightPosition = vec4(-0.3, 3.0, ballZ, 1.0);
    gl.uniform4fv(gl.getUniformLocation(program,"lightPosition"), flatten(lightPosition));
    let spotlightDirection = vec3(0.0, -1.0, 0.0);
    gl.uniform3fv(gl.getUniformLocation(program,"spotlightDirection"), flatten(spotlightDirection));
    gl.uniform1f(gl.getUniformLocation(program, "spotlightCutoff"), 0.85);

    // Clear background on each loop
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawSky();

    // Rotates blue paddle
    let pad_b_offset = mult(
        translate(0.0, 0.0, -2.0),
        mult(
            translate(0.0, 3.25, bPadZ),
            rotateX(90.0)
        )
    );

    // Rotates red paddle
    let pad_r_offset = mult(
        translate(0.0, 0.0, -2.0),
        mult(
            translate(0.0, 2.6, rPadZ),
            mult(
                rotateX(-90.0),
                translate(0.0, 0.0, 0.0)
            )
        )
    );

    let ballT = translate(-0.3, 0, ballZ);
    
    // computer rect
    let scaleX = canvas.width / 1600;
    let scaleY = canvas.height / 900;
    let mirrorSX = Math.floor(479 * scaleX);
    let mirrorSH = Math.ceil(139 * scaleY);
    let mirrorSW = Math.ceil(643 * scaleX);
    let mirrorSY = Math.floor(canvas.height - 163 * scaleY);

    // Displays model in viewport
    if (table_buffers) drawModel(table, table_buffers, mat4());
    if (pad_b_buffers) drawModel(pad_b, pad_b_buffers, pad_b_offset);
    if (pad_r_buffers) drawModel(pad_r, pad_r_buffers, pad_r_offset);
    if (ball_buffers) drawModel(ball, ball_buffers, ballT);

    // draw mirror surface and need blend in order for us to see the ball
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawMirrorSurface();
    gl.disable(gl.BLEND);  

    // draw reflection on the top of the mirror
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(mirrorSX, mirrorSY, mirrorSW, mirrorSH);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    // diasable depth (reflection always on the top of themirror)
    gl.disable(gl.DEPTH_TEST);
    
    // have bright ambient and changr the light for reflection
    gl.uniform4fv(gl.getUniformLocation(program, "vAmbient"), flatten(vec4(1.0, 1.0, 1.0, 1.0)));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(vec4(-1.148, 3.0, ballZ, 1.0)));

    let reflectT = mult(translate(REFLECT_DX, 0, 0), ballT);
    if (ball_buffers) drawModel(ball, ball_buffers, reflectT);

    // change back lighnting
    gl.enable(gl.DEPTH_TEST);
    gl.uniform4fv(gl.getUniformLocation(program, "vAmbient"), flatten(vec4(0.4, 0.4, 0.4, 1.0)));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(vec4(2.0, 4.0, 2.0, 1.0)));
    gl.disable(gl.SCISSOR_TEST);

    // Loops render
    requestAnimationFrame(render);
}

// build buffers for mirror
function buildMirrorBuffers() {
    let positions = [
        vec4(MX, MY_BOT, MZ_MIN, 1), vec4(MX, MY_TOP, MZ_MIN, 1), vec4(MX, MY_TOP, MZ_MAX, 1), vec4(MX, MY_BOT, MZ_MIN, 1), vec4(MX, MY_TOP, MZ_MAX, 1), vec4(MX, MY_BOT, MZ_MAX, 1),
    ];
    let normals = Array(6).fill(null).map(() => vec3(1, 0, 0));
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    return {positionBuffer, normalBuffer};
}

// draw mirror surface and use light blue with a high specular
function drawMirrorSurface() {
    gl.bindBuffer(gl.ARRAY_BUFFER, mirrorBuffers.positionBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, mirrorBuffers.normalBuffer);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.uniform4fv(gl.getUniformLocation(program, "vDiffuse"), new Float32Array([0.7, 0.88, 1.0, 0.5]));
    gl.uniform4fv(gl.getUniformLocation(program, "vSpecular"), new Float32Array([1.0, 1.0, 1.0, 1.0]));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelMatrix"), false, flatten(mat4()));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * Builds model buffers separated by materials.
 *
 * @param model   The model to build from.
 * @returns {any[]} List of buffers.
 */
function buildModelBuffers(model) {
    // Create map to group array of faces by material
    // Key: Material
    // value: faces[] (array of faces)
    let mtlGroups = new Map();
    let faces = model.faces; // variable for model faces.

    // Loop through faces to build material groups
    for (let i = 0; i < faces.length; i++) {
        // Get material associated with current face.
        let mat = faces[i].material;

        // If this material doesn't exist in the group,
        // append it to the array of materials
        if (!mtlGroups.has(mat)) {
            mtlGroups.set(mat, []);
        }

        // Append this face to its material key
        mtlGroups.get(mat).push(faces[i]);
    }

    // Create an array of buffers
    // Each entry holds a list of attributes
    // for each material group
    let bufferGroups = [];

    // Loop through material groups to
    // build separate buffers for each material
    for (let [material, faces] of mtlGroups) {
        // Create position and normals buffer
        let positions = [];
        let normals = [];

        // Loop through the faces associated with each
        // material to retrieve normals and position vertices
        for (let i = 0; i < faces.length; i++) {
            for (let j = 0; j < faces[i].faceVertices.length; j++) {
                // Store face vertices in position array
                positions.push(faces[i].faceVertices[j]);

                // If the face contains normals, store normals
                // into normals array
                if (faces[i].faceNormals.length > 0)
                    normals.push(faces[i].faceNormals[j]);
            }
        }

        // Create vertex position buffer
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

        // Create normals buffer
        let normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

        // Store all data into buffers array
        bufferGroups.push({
            material: material,
            positionBuffer: positionBuffer,
            normalBuffer: normalBuffer,
            vertexCount: positions.length
        });
    }

    return bufferGroups;
}

/**
 * Draws model to screen with provided buffer data.
 *
 * @param model The model to draw.
 * @param bufferGroups List of attributes used to draw model.
 * @param matrix Model matrix to use for movement.
 */
function drawModel(model, bufferGroups, matrix) {
    // Loop through each buffer group to retrieve attribute data.
    for (let group of bufferGroups) {
        // Bind position buffer to vPosition program variable
        gl.bindBuffer(gl.ARRAY_BUFFER, group.positionBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        // // Bind normals buffer to vNormal program variable
        gl.bindBuffer(gl.ARRAY_BUFFER, group.normalBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        // Apply correct material
        let diffuse = model.diffuseMap.get(group.material);
        let specular = model.specularMap.get(group.material);

        // Bind diffuse map to uDiffuse program variable
        gl.uniform4fv(
            gl.getUniformLocation(program, "vDiffuse"),
            diffuse
        );

        // Bind specular map to uDiffuse program variable
        gl.uniform4fv(
            gl.getUniformLocation(program, "vSpecular"),
            specular
        );

        // Create model matrix
        let modelMatrix = gl.getUniformLocation(program, "modelMatrix");
        gl.uniformMatrix4fv(modelMatrix, false, flatten(matrix));

        // Render object to screen
        gl.drawArrays(gl.TRIANGLES, 0, group.vertexCount);
    }
}

/**
 * Triggers paddle movement based on the
 * position of the ball.
 */
function padTrigger(){
    // Check ball bounds for red paddle movement to
    // trigger animation.
    // Reset pad direction when animation finishes
    if (ballZ < -1.5 && !move_rPad){
        move_rPad = true;
    } else if (ballZ > -1.5){
        rPadSpeed *= -1.0;
    }

    // Check ball bounds for blue paddle movement to
    // trigger animation.
    // Reset pad direction when animation finishes
    if (ballZ > 1.0 && !move_bPad) {
        move_bPad = true;
    } else if(ballZ < 1.0) {
        bPadSpeed *= -1.0;
    }
}

/**
 * Calculates movement for all objects
 * that move within the scene.
 */
function calcObjectMovements(){
    // Change ball direction at bounds:
    // Blue paddle (left) || red paddle (right)
    if(ballZ > 1.5 && ballSpeed > 0.0 || ballZ < -2.0 && ballSpeed < 0.0){
        ballSpeed *= -1.0;
    }

    // Move red paddle if triggered
    if(move_rPad){
        rPadZ -= rPadSpeed;
        if(rPadZ < 1.8 && rPadSpeed > 0.0){
            rPadSpeed *= -1.0;
        }
        if(rPadZ >= 2.0 && rPadSpeed < 0.0){
            move_rPad = false;
            rPadZ = 2.0;
        }
    }

    // Move blue paddle if triggered
    if(move_bPad){
        bPadZ += bPadSpeed;
        console.log(bPadZ);
        if(bPadZ > 2.2 && bPadSpeed > 0.0){
            bPadSpeed *= -1.0;
        }
        if(bPadZ <= 2.0 && bPadSpeed < 0.0){
            move_bPad = false;
            bPadZ = 2.0;
        }
    }

    // Move ball
    ballZ+= ballSpeed;
}
