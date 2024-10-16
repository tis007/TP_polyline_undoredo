import Stack from './stack';
import Konva from "konva";
import { createMachine, interpret } from "xstate";

// ===========================================================================

class UndoManager {
    constructor(buttonUndo, buttonRedo) {
        this.buttonUndo = buttonUndo;
        this.buttonRedo = buttonRedo;
        this.stackUndo = new Stack();
        this.stackRedo = new Stack();
        buttonUndo.disabled = true;
        buttonRedo.disabled = true;
    }

    undo() {
        if (stackUndo.isEmpty()) {
            return;
        }
        let command = stackUndo.pop();
        stackRedo.push(command);
        command.undo();
        this.disableButtons();
    }

    redo() {
        if (stackRedo.isEmpty()) {
            return;
        }
        let command = stackRedo.pop();
        stackUndo.push(command);
        command.execute();
        this.disableButtons(); 
    }

    execute(command) {
        command.execute();
        stackUndo.push(command);
        this.disableButtons();
    }

    disableButtons() {
        this.buttonUndo.disabled = !this.canUndo();
        this.buttonRedo.disabled = !this.canRedo();
    }

    canUndo() {
        return !stackUndo.isEmpty();
    }

    canRedo() {
        return !stackRedo.isEmpty();
    }
}

class Command {
    execute() { };
    undo() { };
}

class AddPolylineCommand extends Command {
    constructor(polyline, dessin) {
        super();
        this.myPolyline = polyline;
        this.myDessin = dessin;
    }

    execute() {
        this.myDessin.add(this.myPolyline);
    }

    undo() {
        this.myPolyline.remove();
    }
}

//===========================================================================

const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

// Une couche pour le dessin
const dessin = new Konva.Layer();
// Une couche pour la polyline en cours de construction
const temporaire = new Konva.Layer();
stage.add(dessin);
stage.add(temporaire);

const undoButton = document.getElementById("undo");
const redoButton = document.getElementById("redo");
let undoManager = new UndoManager(undoButton, redoButton);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiAIwAWAGxEArAGYAnFo17digEwB2HcoA0ITEp2KiADi1bV21Xy3LFOjRoC+-tZoWHiERNJgAAqoBOLU9MxsnLyCsmhiktKyCgiqWsaabsrGjo6lxtqm1rYIPg7Oru6e3r4BQSAhOATEkTFxCYxMtABqTPxCSJ2iElIyU7nKplpEvo46xi66jspapho1SnwOpVo+paoqxmqOgcEY3eF9sfjxTLAAxgCGyGAT6TMsvNQLlFKpCsp1nsTLpzAUtIcEAU+E5Krs-KpVPtyndpqEekQALZffCYfqvWCDJIcbj-KYZWbZBZHZZFLx8YwcxymJaIsyOIimZaY8wWUx8HZaXFdMLEYmk8niSm0IbJWmKSYiTJzHJHRSmIilHnLY7GHyORFLAV6U2ODR8DT5MzSh6yokkskvJVU4Y0MZ0rWM4HyJQmDRETHg0yVNHKDTVGx6w3Oc6OS4lJYu-HheWeuKU97fX4B6bapkgxCODmaPjmfYabkaNTGRG6JzR8EWXT6EymLOPOUexUF15gABOJYZQN1CA2Onb0c2DfyygliIAtIoUd59VVlJC9pjbh0ZQTc8OKAAhL4fADWsGQN7+aXpgJ1zIQywNimc9fqzmcVt9CIAomz4VQrS3HRj3ubNBwVL1KWvO8HyfHgNQBMtg0WMwiEUBsNnjVpFB8VRW1KEC0VcLQHTTRQpVxfBUAgOAATgzCgxndc1CIbxhQ8flkQRRMEHXHQDVMEjTA8TELB0fIGNggcSDIMAOOnD8HAbYwFPEs0sXkso+RUQ1l3E7xuTBLx+zdZ44nU98KyRHkQIsKsDAlTkzmM5RTLTcyf0klcbLPIdEIc8sQzqPhV1MrcFJXHlER-AUDNKPxnHjUxuUCQIgA */
        id: "polyLine",
        initial: "idle",
        states: {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "onePoint",
                        actions: "createLine",
                    },
                },
            },
            onePoint: {
                on: {
                    MOUSECLICK: {
                        target: "manyPoints",
                        actions: "addPoint",
                    },
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Escape: { // event.key
                        target: "idle",
                        actions: "abandon",
                    },
                },
            },
            manyPoints: {
                on: {
                    MOUSECLICK: [
                        {
                            actions: "addPoint",
                            cond: "pasPlein",
                        },
                        {
                            target: "idle",
                            actions: ["addPoint", "saveLine"],
                        },
                    ],

                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon",
                    },

                    Enter: { // event.key
                        target: "idle",
                        actions: "saveLine",
                    },

                    Backspace: [ // event.key
                        {
                            target: "manyPoints",
                            actions: "removeLastPoint",
                            cond: "plusDeDeuxPoints",
                            internal: true,
                        },
                        {
                            target: "onePoint",
                            actions: "removeLastPoint",
                        },
                    ],
                },
            },
        },
    },
    {
        actions: {
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                temporaire.add(polyline);
            },
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                dessin.add(polyline);
                undoManager.execute(new AddPolylineCommand(polyline, dessin));
                dessin.batchDraw();
            },
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            abandon: (context, event) => {
                polyline.remove();
            },
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            pasPlein: (context, event) => {
                // On peut encore ajouter un point
                return polyline.points().length < MAX_POINTS * 2;
            },
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
        },
    }
);

const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();

stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    polylineService.send(event.key);
});


var stackUndo = new Stack();
var stackRedo = new Stack();

// bouton Undo
undoButton.addEventListener("click", () => {
    undoManager.undo();

});

redoButton.addEventListener("click", () => {
    undoManager.redo();
});


