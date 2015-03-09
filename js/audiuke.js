/*
 * pitchdetect.js
 * Copyright (c) 2014 Chris Wilson
 * Adapted for AngluarJS app Brainuke
 */

window.app.service("Audiuke", function() {

	window.AudioContext = window.AudioContext || window.webkitAudioContext;

	var audioContext = null;
	var isPlaying = false;
	var sourceNode = null;
	var analyser = null;
	var theBuffer = null;
	var DEBUGCANVAS = null;
	var mediaStreamSource = null;
	var detectorElem, 
		canvasElem,
		waveCanvas,
		pitchElem,
		noteElem,
		detuneElem,
		detuneAmount;

	this.init = function(callback) {
		audioContext = new AudioContext();
		this.getUserMedia({
			audio: true,
			video: false
		}, callback, function(error) {
			console.log("Error in getUserMedia: " + error);
		});
	}

	this.getUserMedia = function(dictionary, callback, error) {
		try {
			navigator.getUserMedia = 
				navigator.getUserMedia ||
				navigator.webkitGetUserMedia ||
				navigator.mozGetUserMedia;
			navigator.getUserMedia(dictionary, callback, error);
		} catch (e) {
			alert('getUserMedia threw exception :' + e);
		}
	}

	this.gotStream = function(stream) {
		// Create an AudioNode from the stream.
		mediaStreamSource = audioContext.createMediaStreamSource(stream);

		// Connect it to the destination.
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		mediaStreamSource.connect( analyser );
		updatePitch();
	}

	this.toggleOscillator = function() {
		if (isPlaying) {
			//stop playing and return
			sourceNode.stop( 0 );
			sourceNode = null;
			analyser = null;
			isPlaying = false;
			if (!window.cancelAnimationFrame)
				window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
			window.cancelAnimationFrame( rafID );
			return "play oscillator";
		}
		sourceNode = audioContext.createOscillator();

		analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		sourceNode.connect( analyser );
		analyser.connect( audioContext.destination );
		sourceNode.start(0);
		isPlaying = true;
		isLiveInput = false;
		updatePitch();

		return "stop";
	}

	this.toggleLiveInput = function() {
		if (isPlaying) {
			//stop playing and return
			sourceNode.stop( 0 );
			sourceNode = null;
			analyser = null;
			isPlaying = false;
			if (!window.cancelAnimationFrame)
				window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
			window.cancelAnimationFrame( rafID );
		}
		getUserMedia(
			{
				"audio": {
					"mandatory": {
						"googEchoCancellation": "false",
						"googAutoGainControl": "false",
						"googNoiseSuppression": "false",
						"googHighpassFilter": "false"
					},
					"optional": []
				},
			}, gotStream);
	}

	this.togglePlayback = function() {
		if (isPlaying) {
			//stop playing and return
			sourceNode.stop( 0 );
			sourceNode = null;
			analyser = null;
			isPlaying = false;
			if (!window.cancelAnimationFrame)
				window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
			window.cancelAnimationFrame( rafID );
			return "start";
		}

		sourceNode = audioContext.createBufferSource();
		sourceNode.buffer = theBuffer;
		sourceNode.loop = true;

		analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		sourceNode.connect( analyser );
		analyser.connect( audioContext.destination );
		sourceNode.start( 0 );
		isPlaying = true;
		isLiveInput = false;
		updatePitch();

		return "stop";
	}

	var rafID = null;
	var tracks = null;
	var buflen = 1024;
	var buf = new Float32Array(buflen);

	var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

	this.noteFromPitch = function(frequency) {
		var noteNum = 12 * ( Math.log(frequency / 440)/Math.log(2) );
		return Math.round(noteNum) + 69;
	}

	this.frequencyFromNoteNumber = function(note) {
		return 440 * Math.pow(2,(note-69)/12);
	}

	this.centsOffFromPitch = function(frequency, note) {
		return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber(note))/Math.log(2) );
	}

	// this is a float version of the algorithm below - but it's not currently used.
	/*
	function autoCorrelateFloat( buf, sampleRate ) {
		var MIN_SAMPLES = 4;	// corresponds to an 11kHz signal
		var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
		var SIZE = 1000;
		var best_offset = -1;
		var best_correlation = 0;
		var rms = 0;

		if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
			return -1;  // Not enough data

		for (var i=0;i<SIZE;i++)
			rms += buf[i]*buf[i];
		rms = Math.sqrt(rms/SIZE);

		for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
			var correlation = 0;

			for (var i=0; i<SIZE; i++) {
				correlation += Math.abs(buf[i]-buf[i+offset]);
			}
			correlation = 1 - (correlation/SIZE);
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		}
		if ((rms>0.1)&&(best_correlation > 0.1)) {
			console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
		}
	//	var best_frequency = sampleRate/best_offset;
	}
	*/

	var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

	this.autoCorrelate = function(buf, sampleRate) {
		var SIZE = buf.length;
		var MAX_SAMPLES = Math.floor(SIZE/2);
		var best_offset = -1;
		var best_correlation = 0;
		var rms = 0;
		var foundGoodCorrelation = false;
		var correlations = new Array(MAX_SAMPLES);

		for (var i=0;i<SIZE;i++) {
			var val = buf[i];
			rms += val*val;
		}
		rms = Math.sqrt(rms/SIZE);
		if (rms<0.01) // not enough signal
			return -1;

		var lastCorrelation=1;
		for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
			var correlation = 0;

			for (var i=0; i<MAX_SAMPLES; i++) {
				correlation += Math.abs((buf[i])-(buf[i+offset]));
			}
			correlation = 1 - (correlation/MAX_SAMPLES);
			correlations[offset] = correlation; // store it, for the tweaking we need to do below.
			if ((correlation>0.9) && (correlation > lastCorrelation)) {
				foundGoodCorrelation = true;
				if (correlation > best_correlation) {
					best_correlation = correlation;
					best_offset = offset;
				}
			} else if (foundGoodCorrelation) {
				// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
				// Now we need to tweak the offset - by interpolating between the values to the left and right of the
				// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
				// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
				// (anti-aliased) offset.

				// we know best_offset >=1, 
				// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
				// we can't drop into this clause until the following pass (else if).
				var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
				return sampleRate/(best_offset+(8*shift));
			}
			lastCorrelation = correlation;
		}
		if (best_correlation > 0.01) {
			// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
			return sampleRate/best_offset;
		}
		return -1;
	//	var best_frequency = sampleRate/best_offset;
	}

	this.updatePitch = function(time) {
		var cycles = new Array;
		analyser.getFloatTimeDomainData( buf );
		var ac = autoCorrelate( buf, audioContext.sampleRate );
		// TODO: Paint confidence meter on canvasElem here.

		if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
			waveCanvas.clearRect(0,0,512,256);
			waveCanvas.strokeStyle = "red";
			waveCanvas.beginPath();
			waveCanvas.moveTo(0,0);
			waveCanvas.lineTo(0,256);
			waveCanvas.moveTo(128,0);
			waveCanvas.lineTo(128,256);
			waveCanvas.moveTo(256,0);
			waveCanvas.lineTo(256,256);
			waveCanvas.moveTo(384,0);
			waveCanvas.lineTo(384,256);
			waveCanvas.moveTo(512,0);
			waveCanvas.lineTo(512,256);
			waveCanvas.stroke();
			waveCanvas.strokeStyle = "black";
			waveCanvas.beginPath();
			waveCanvas.moveTo(0,buf[0]);
			for (var i=1;i<512;i++) {
				waveCanvas.lineTo(i,128+(buf[i]*128));
			}
			waveCanvas.stroke();
		}

		if (ac == -1) {
			console.log("vague");
			/*detectorElem.className = "vague";
			pitchElem.innerText = "--";
			noteElem.innerText = "-";
			detuneElem.className = "";
			detuneAmount.innerText = "--";*/
		} else {
			
			//detectorElem.className = "confident";
			pitch = ac;
			//pitchElem.innerText = Math.round( pitch ) ;
			var note =  noteFromPitch( pitch );
			//noteElem.innerHTML = noteStrings[note%12];
			var detune = centsOffFromPitch( pitch, note );
			/*if (detune == 0 ) {
				detuneElem.className = "";
				detuneAmount.innerHTML = "--";
			} else {
				if (detune < 0)
					detuneElem.className = "flat";
				else
					detuneElem.className = "sharp";
				detuneAmount.innerHTML = Math.abs( detune );
			}
			*/
			console.log("confident",pitch,note,detune,noteStrings[note%12]);
		}

		if (!window.requestAnimationFrame)
			window.requestAnimationFrame = window.webkitRequestAnimationFrame;
		rafID = window.requestAnimationFrame( updatePitch );
	}
	
});
