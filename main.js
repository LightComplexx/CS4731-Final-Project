"use strict"; // Disallow unsafe behavior like using uninitialized variables

// WebGL globals
let canvas;
let gl;
let program;

let vPosition;  // Vertex position attribute
let vNormal;    // Normals position attribute
let uDiffuse;   // Diffuse map attribute
let uSpecular;  // Specular map attribute

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

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    // Create project and view matrices
    let projection = perspective(45, canvas.width / canvas.height, 0.1, 100);
    let view = lookAt(
        vec3(5, 4, 0),  // camera position
        vec3(1, 2, 0),   // look at center
        vec3(0, 1, 0)    // up
    );

    // Connect projection and view to vertex shader
    let uProjection = gl.getUniformLocation(program, "uProjection");
    let uView = gl.getUniformLocation(program, "uView");

    // Send flattened projection/view matrices
    gl.uniformMatrix4fv(uProjection, false, flatten(projection));
    gl.uniformMatrix4fv(uView, false, flatten(view));

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

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

    // Call render function
    render();
}

function render() {
    // Clear background on each loop
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Build each model buffer when both
    // the object and material are parsed
    if (!table_buffers && table.objParsed && table.mtlParsed)
        table_buffers = buildModelBuffers(table);

    if (!pad_b_buffers && pad_b.objParsed && pad_b.mtlParsed)
        pad_b_buffers = buildModelBuffers(pad_b);

    if (!pad_r_buffers && pad_r.objParsed && pad_r.mtlParsed)
        pad_r_buffers = buildModelBuffers(pad_r);

    if (!ball_buffers && ball.objParsed && ball.mtlParsed)
        ball_buffers = buildModelBuffers(ball);

    // Displays model in viewport
    if (table_buffers) drawModel(table, table_buffers);
    if (pad_b_buffers) drawModel(pad_b, pad_b_buffers);
    if (pad_r_buffers) drawModel(pad_r, pad_r_buffers);
    if (ball_buffers) drawModel(ball, ball_buffers);

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
 */
function drawModel(model, bufferGroups) {
    // Loop through each buffer group to retrieve attribute data.
    for (let group of bufferGroups) {

        // Bind position buffer to vPosition program variable
        vPosition = gl.getAttribLocation(program, "vPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, group.positionBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        // Bind normals buffer to vNormal program variable
        vNormal = gl.getAttribLocation(program, "vNormal");
        gl.bindBuffer(gl.ARRAY_BUFFER, group.normalBuffer);
        gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);

        // Apply correct material
        let diffuse = model.diffuseMap.get(group.material);
        let specular = model.specularMap.get(group.material);

        // Bind diffuse map to uDiffuse program variable
        gl.uniform4fv(
            gl.getUniformLocation(program, "uDiffuse"),
            diffuse
        );

        // Bind specular map to uDiffuse program variable
        gl.uniform4fv(
            gl.getUniformLocation(program, "uSpecular"),
            specular
        );

        // Render object to screen
        gl.drawArrays(gl.TRIANGLES, 0, group.vertexCount);
    }
}