const notesHz = [
  { hz: 130.8, note: "C3" },
  { hz: 146.8, note: "D3" },
  { hz: 164.8, note: "E3" },
  { hz: 174.6, note: "F3" },
  { hz: 196.0, note: "G3" },
  { hz: 220.0, note: "A3" },
  { hz: 246.9, note: "B3" },
  { hz: 261.6, note: "C4" },
];

const percussionSounds = [
  "percussion/clap-sound.mp3",
  "percussion/hi-hat.mp3",
  "percussion/cymbal.mp3",
  "percussion/drum.mp3",
];

const THUMB_F = 4;
const INDEX_F = 8;

window.onload = function () {
  const videoElement = document.getElementById("webcam");
  const canvasElement = document.getElementById("canvas");
  const canvasCtx = canvasElement.getContext("2d");

  let audioContext;
  let oscillator;
  let gainNode;
  let thumb_index_press = [false, false, false, false];
  let isRecording = false;
  let currentRecording = [];
  let startloop = false;

  const synth = new Tone.Sampler({
    urls: {
      C3: "piano/c3.mp3",
      D3: "piano/d3.mp3",
      E3: "piano/e3.mp3",
      F3: "piano/f3.mp3",
      G3: "piano/g3.mp3",
      A3: "piano/a3.mp3",
      B3: "piano/b3.mp3",
      C4: "piano/c4.mp3",
    },
    release: 1,
  }).toDestination();
  let currentNote = null;

  let melody = true;

  async function setupHandTracking() {
    if (typeof handPoseDetection !== "undefined") {
      const model = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
        }
      );

      async function detectHands() {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        const both_hands = await model.estimateHands(videoElement);
        let point_h = -1;
        let keyDown = false;

        if (both_hands.length > 0) {
          let play_hand = both_hands.find((item) => item.handedness === "Left");

          if (both_hands.length == 2) {
            // LEFT HAND RECORD / STOP
            left_hand = both_hands.find((item) => item.handedness === "Right");
            if (left_hand !== undefined) {
              left_index_color = "red";
              left_thumb_color = "black";

              left_index = left_hand.keypoints[8];
              let x_left = left_index.x;
              let y_left = left_index.y;

              left_thumb = left_hand.keypoints[4];
              let x_left_th = left_thumb.x;
              let y_left_th = left_thumb.y;

              //console.log(pointDist(left_index, left_thumb));
              let prev_isRecording = isRecording;
              if (pointDist(left_index, left_thumb) < 25) {
                left_index_color = "green";

                isRecording = true;
                console.log("RECORDING");
              } else {
                isRecording = false;
              }

              if (isRecording != prev_isRecording) {
                if (isRecording) {
                  console.log("start recording...");
                  // get time of start
                  currentRecording = [];
                  currentRecording.push({ time: Date.now(), audio: null });
                } else {
                  // get time of end
                  currentRecording.push({ time: Date.now(), audio: null });

                  currentRecording = currentRecording.map((obj, index, arr) => {
                    if (index === 0) {
                      return { ...obj, time: 0 }; // First object time is 0
                    } else {
                      const timeDifference = obj.time - arr[index - 1].time;
                      return { ...obj, time: timeDifference }; // Subsequent objects get the difference
                    }
                  });

                  console.log("stop recording");
                  console.log(currentRecording);
                }
              }

              drawCircle(
                x_left,
                y_left,
                canvasElement.width,
                left_index_color,
                true,
                "R"
              );

              drawCircle(
                x_left_th,
                y_left_th,
                canvasElement.width,
                left_thumb_color
              );
            }
          }
          if (play_hand === undefined) {
            // LEFT HAND

            play_hand = both_hands[0];
            const pointArr = [8, 12, 16, 20];
            const COLORS = ["red", "orange", "blue", "yellow"];

            let thumb_color = "teal";

            for (let i = 0; i < pointArr.length; i++) {
              let keypoint = play_hand.keypoints[pointArr[i]];
              let x = keypoint.x;
              let y = keypoint.y;

              if (
                pointDist(
                  play_hand.keypoints3D[4],
                  play_hand.keypoints3D[pointArr[i]]
                ) < 0.04
              ) {
                drawCircle(x, y, canvasElement.width, "green");
                thumb_color = "green";

                const prevloops = startloop;
                if (i == 0) {
                  //("loop it");
                  startloop = true;
                  //loopIt();
                } else {
                  startloop = false;
                }

                if (i == 2) {
                  // MELODY MODE
                  //document.getElementById("pMOrP").innerHTML = "MELODY MODE";
                  melody = true;
                } else if (i == 3) {
                  // PERCUSSION MODE
                  //document.getElementById("pMOrP").innerHTML =
                  //  "PERCUSSION MODE";
                  melody = false;
                } else if (i == 1) {
                  // reset recording
                  currentRecording = [];
                }
                if (prevloops != startloop && startloop) {
                  loopIt();
                }
              } else {
                drawCircle(x, y, canvasElement.width, COLORS[i]);
              }
            }

            let keypoint_th = play_hand.keypoints[4];
            let x_th = keypoint_th.x;
            let y_th = keypoint_th.y;
            drawCircle(x_th, y_th, canvasElement.width, thumb_color);
          } else {
            // RIGHT HAND
            const pointArr = [8, 12, 16, 20];
            const COLORS = ["red", "orange", "blue", "yellow"];
            let play_color = "red";

            if (melody) {
              // MELODY
              let keypoint = play_hand.keypoints[8];
              let x = keypoint.x;
              let y = keypoint.y;
              point_h = y;

              let y_frac = 1 - y / canvasElement.height;
              let frequency = getNoteFrequency(y_frac);

              //document.getElementById("noteP").innerHTML =
              //  "note:" + frequency.note;
              if (melody) {
                if (
                  pointDist(
                    play_hand.keypoints3D[10],
                    play_hand.keypoints3D[4]
                  ) < 0.025
                ) {
                  playContinuousNote(frequency.note);
                  play_color = "green";
                  keyDown = true;
                } else {
                  stopContinuousNote();
                }
              }
              drawCircle(x, y, canvasElement.width, "blue");

              [10, 4].forEach((point) => {
                let keypoint = play_hand.keypoints[point];
                let x = keypoint.x;
                let y = keypoint.y;
                drawCircle(x, y, canvasElement.width, play_color);
              });
            } else {
              // PERCUSSION
              stopContinuousNote();
              let thumb_color = "teal";
              for (let i = 0; i < pointArr.length; i++) {
                let this_finger_data = play_hand.keypoints3D[pointArr[i]];
                let thumb_data = play_hand.keypoints3D[THUMB_F];

                let this_finger_color = COLORS[i];

                let prev_press = thumb_index_press[i];
                if (pointDist(thumb_data, this_finger_data) < 0.033) {
                  thumb_index_press[i] = true;
                  this_finger_color = "green";
                  thumb_color = "green";
                } else if (pointDist(thumb_data, this_finger_data) > 0.036) {
                  thumb_index_press[i] = false;
                }

                if (
                  prev_press != thumb_index_press[i] &&
                  thumb_index_press[i]
                ) {
                  console.log("press");
                  if (isRecording) {
                    currentRecording.push({
                      time: Date.now(),
                      audio: percussionSounds[i],
                    });
                  }
                  const clap_sound = new Audio(percussionSounds[i]);

                  clap_sound.play();
                }

                let keypoint = play_hand.keypoints[pointArr[i]];
                let x = keypoint.x;
                let y = keypoint.y;

                drawCircle(x, y, canvasElement.width, this_finger_color);
              }

              let keypoint = play_hand.keypoints[4];
              let x = keypoint.x;
              let y = keypoint.y;
              drawCircle(x, y, canvasElement.width, thumb_color);
            }
          }
        } else {
          stopContinuousNote();
          setGain(0);
          //document.getElementById("noteP").innerHTML = "note:";
        }

        if (melody) {
          drawKeyBoard(point_h, keyDown);
        }

        requestAnimationFrame(detectHands);
      }

      detectHands();
    } else {
      console.error("handPoseDetection is not available.");
    }
  }

  function drawKeyBoard(point_h, keyDown = false) {
    const numRectangles = 8;
    const rectHeight = canvasElement.height / numRectangles;
    const rectWidth = 100;

    for (let i = 0; i < numRectangles; i++) {
      if (point_h > i * rectHeight && point_h < i * rectHeight + rectHeight) {
        if (keyDown) {
          canvasCtx.fillStyle = `#314ca3`;
        } else {
          canvasCtx.fillStyle = `#aec4e6`;
        }
      } else {
        canvasCtx.fillStyle = `white`;
      }

      canvasCtx.fillRect(0, i * rectHeight, rectWidth, rectHeight); // Draw filled rectangle

      canvasCtx.strokeStyle = "black"; // Border color
      canvasCtx.lineWidth = 2; // Border thickness

      canvasCtx.beginPath();
      canvasCtx.moveTo(0, i * rectHeight); // Move to the top-left corner of the rectangle
      canvasCtx.lineTo(rectWidth, i * rectHeight); // Draw a line to the top-right corner
      canvasCtx.stroke(); // Apply the stroke

      canvasCtx.beginPath();
      canvasCtx.moveTo(0, (i + 1) * rectHeight); // Move to the bottom-left corner of the rectangle
      canvasCtx.lineTo(rectWidth, (i + 1) * rectHeight); // Draw a line to the bottom-right corner
      canvasCtx.stroke();

      canvasCtx.font = "15px Arial";
      canvasCtx.fillStyle = "black";
      canvasCtx.fillText(notesHz[7 - i].note, 10, i * rectHeight + 30);
    }
  }

  function playContinuousNote(note) {
    if (currentNote !== note) {
      if (currentNote) {
        synth.triggerRelease(); // Stop the current note
      }
      if (isRecording) {
        console.log("added note");
        audioFile = "piano/" + note.toLocaleLowerCase() + ".mp3";
        currentRecording.push({
          time: Date.now(),
          audio: audioFile,
        });
      }
      synth.triggerAttack(note); // Play the new note
      currentNote = note; // Update the current note
    }
  }

  function stopContinuousNote() {
    if (currentNote) {
      synth.triggerRelease();
      currentNote = null;
    }
  }

  function pointDist(p1, p2) {
    if (p1.hasOwnProperty("z")) {
      return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
          Math.pow(p1.y - p2.y, 2) +
          Math.pow(p1.z - p2.z, 2)
      );
    } else {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
  }

  function drawCircle(x, y, w, color, fill = false, text = "") {
    canvasCtx.strokeStyle = color; // Border color

    canvasCtx.lineWidth = 4;
    canvasCtx.beginPath();
    canvasCtx.arc(w - x, y, 10, 0, 2 * Math.PI); // 10 is the radius of the circle

    canvasCtx.stroke();

    if (color == "green" || fill) {
      canvasCtx.fillStyle = color; // Color of the circle
      canvasCtx.fill();
    }

    if (text != "") {
      canvasCtx.font = "15px Arial";
      canvasCtx.fillStyle = "black";
      canvasCtx.fillText(text, w - x - 5, y + 5);
    }
  }

  function setGain(value) {
    if (gainNode) {
      gainNode.gain.setValueAtTime(value, audioContext.currentTime); // Adjust gain value (volume)
    }
  }

  function playSound(frequency, duration) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function startSound() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function updateFrequency(frequency) {
    if (oscillator) {
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    }
  }

  function getNoteFrequency(y_frac) {
    // Map the finger height to the range of available notes
    const index = Math.floor(y_frac * notesHz.length);
    const clampedIndex = Math.max(0, Math.min(index, notesHz.length - 1));
    return notesHz[clampedIndex];
  }

  function getAbsTime(arr) {
    let accumulatedTime = 0;

    arr = arr.map((item) => {
      accumulatedTime += item.time;
      return { ...item, time: accumulatedTime };
    });
    return arr;
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.addEventListener("loadeddata", setupHandTracking);
    })
    .catch((err) => {
      console.error("Error accessing webcam: ", err);
    });

  function calculateCumulativeTimes(arr) {
    let cumulativeTime = 0;
    return arr.map((event) => {
      cumulativeTime += event.time;
      return {
        ...event,
        cumulativeTime,
      };
    });
  }

  function insertIntoSecondArray(firstArray, secondArray) {
    firstArray.forEach((firstEvent) => {
      if (firstEvent.audio) {
        // Find the correct position in the second array based on cumulative time
        let insertIndex = secondArray.findIndex(
          (secondEvent) =>
            secondEvent.cumulativeTime > firstEvent.cumulativeTime
        );

        if (insertIndex === -1) {
          insertIndex = secondArray.length; // If it's beyond all events, add at the end
        }

        const timeDifference =
          firstEvent.cumulativeTime -
          (secondArray[insertIndex - 1]?.cumulativeTime || 0);

        // Insert the event
        secondArray.splice(insertIndex, 0, {
          time: timeDifference,
          audio: firstEvent.audio,
        });

        // Adjust the following event's delay
        if (insertIndex + 1 < secondArray.length) {
          secondArray[insertIndex + 1].time -= timeDifference;
        }
      }
    });

    // Remove the cumulativeTime from final result
    return secondArray.map((event) => {
      const { cumulativeTime, ...rest } = event;
      return rest;
    });
  }

  const loopIt = async () => {
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < currentRecording.length - 1; i++) {
        if (currentRecording[i].audio != null) {
          const singleInstrument = new Audio(currentRecording[i].audio);
          singleInstrument.play();
        }
        console.log("waiting for: ", currentRecording[i + 1].time);
        await delay(currentRecording[i + 1].time);
      }
    }
  };
};
