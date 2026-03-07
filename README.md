## *Overview*

Our table tennis animation project is an interactive 3D table tennis built in WebGL where two paddles pass the ball back and forth across the tennis table. It includes animations, a spotlight, textures, camera movement, a reflection, a prototype refraction, and is controlled with a keyboard.


## *How to Use*

Simply download the code and open the html file



## *Controls*

A - Toggle Animation 

S - Toggle mirror visibility 

L - Enable-disable lighting 

Arrow Keys - Move camera vertically and horizontally  

  

## Members:

**Anh Dinh**

*Responsibilities:*
- Did a point light using Phong light shading
- One spotlight with clearly visible boundaries (pointing down to the table)
- One clearly visible reflection (mirror placed on table and show reflection of animated ball move back and forth)
- One textured skybox
- Helped with team coordination, schedule Zoom meetings, made sure that everyone stayed updated and helped the team with keep progressing on our tasks

*Challenges:*
- My lighting looked incorrect at first when I was trying to adjust brightness of object. The shading then is too dark or also too bright because my diffuse and specular parts were not balanced correctly. After a Zoom meeting with Rodrick we then figured out the right vector calculation and change for it to look more realistic and shiny.
- Had conflicts with merging main to branch.
##

**Rodrick Moore**  

*Responsibilities:*
- Imported objects from Sketchfab (credits to Animated Fox 3D)
- Did ball and paddle animations
- Added key controls A - Toggles animations
- S - toggles background surface that shows ball reflection
- L - Toggles scene lighting

*Challenges:*
- Initial implementation of the objects was a lot harder than I anticipated. I opted not to use an external library, so I had to understand the provided model and face classes to figure out how to build position and color buffers from the .obj and .mtl files.
- Handling many of the merge conflicts when merging our branches into main.
##

**Nicholas Giangregorio**  
*Responsibilities:*
- Camera movement
- Hierarchical model (flag)
- Prototype/Placeholder refraction cylinder

*Challenges:*  
- Camera movement mysteriously alters the shape of the mirror, and also changes the position of the spotlight
- Couldn't figure out how to get a proper refraction. Attempted to do so using a cubemap but couldn't get it working
