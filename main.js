"use strict"; // Disallow unsafe behavior like using uninitialized variables

// WebGL globals
let canvas;
let gl;
let program;

let vPosition;  // Vertex position attribute
let vNormal;    // Normals position attribute
let vTexCoord;  // Texture coordinates attribute

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
let ballTexture;

let table;
let table_buffers;

// Skybox variables
let vTexCoordSky;
let skyTexture;
let skyPositionBuffer;
let skyTexCoordBuffer;

function createBallGradientTexture() {

    const size = 128;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {

            let dx = (x - size/2) / (size/2);
            let dy = (y - size/2) / (size/2);

            let dist = Math.sqrt(dx*dx + dy*dy);

            // Clamp distance
            dist = Math.min(dist, 1.0);

            // Gradient value
            let brightness = 1.0 - dist;

            let color = brightness * 255;

            let index = (y * size + x) * 4;

            data[index] = color;      // R
            data[index+1] = color;    // G
            data[index+2] = color;    // B
            data[index+3] = 255;      // A
        }
    }

    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        size,
        size,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
    );

    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}

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
    vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    vTexCoordSky = gl.getAttribLocation(program, "vTexCoordSky");

    // Create project matrix
    let projMatrix = perspective(40, 1, 0.1, 200);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projMatrix'), false, flatten(projMatrix));

    // eye coordinate
    let lightPosition = vec4(2.0, 4.0, 2.0, 1.0);
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

    // Create ball texture
    ballTexture = createBallGradientTexture();

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
    gl.enableVertexAttribArray(vTexCoordSky);

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

    //cameraPos -= 0.005;

    // Create view matrix
    let viewMatrix = lookAt(
        vec3(6.0, 4.0, cameraPos),    // camera position
        vec3(0.0, 0.5, 0.0),    // look at center
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

    // Displays model in viewport
    if (table_buffers) drawModel(table, table_buffers, mat4());
    if (pad_b_buffers) drawModel(pad_b, pad_b_buffers, pad_b_offset);
    if (pad_r_buffers) drawModel(pad_r, pad_r_buffers, pad_r_offset);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ballTexture);

    gl.uniform1i(
        gl.getUniformLocation(program, "textureMap"),
        0
    );
    if (ball_buffers) drawModel(ball, ball_buffers, translate(-0.3, 0, ballZ));

    // Loops render
    requestAnimationFrame(render);
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
        let texCoords = [];

        // Loop through the faces associated with each
        // material to retrieve normals and position vertices
        for (let i = 0; i < faces.length; i++) {
            for (let j = 0; j < faces[i].faceVertices.length; j++) {
                // Store face vertices in position array
                positions.push(faces[i].faceVertices[j]);

                // Store normals into array
                if (faces[i].faceNormals.length > 0)
                    normals.push(faces[i].faceNormals[j]);

                // Store textures into array
                if (faces[i].faceTexCoords && faces[i].faceTexCoords.length > 0)
                    texCoords.push(faces[i].faceTexCoords[j]);
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

        // Create textures buffer
        let texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

        // Store all data into buffers array
        bufferGroups.push({
            material: material,
            positionBuffer: positionBuffer,
            normalBuffer: normalBuffer,
            texCoordBuffer: texCoordBuffer,
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

        // Bind normals buffer to vNormal program variable
        gl.bindBuffer(gl.ARRAY_BUFFER, group.normalBuffer);
        gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        // Bind texture buffers to vTextCoord program variable
        gl.bindBuffer(gl.ARRAY_BUFFER, group.texCoordBuffer);
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);

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
        if(rPadZ < 1.82 && rPadSpeed > 0.0){
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
        if(bPadZ > 2.17 && bPadSpeed > 0.0){
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
