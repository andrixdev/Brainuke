window.app.service("Model", function() {

	this.notes = [];
	this.score = 0;
	this.players = [];
	this.rankedPlayers = [];
	this.ballRadius = 50;
	this.ringRadius = 230;
	this.ringCenterX = 300;
	this.ringCenterY = 300;
	
	// Add player on the list of players (name and score)
	this.addPlayer = function(playerName) {
		var newPlayer= {};
		newPlayer.name=playerName;
		newPlayer.score=0;
		newPlayer.rank=null;
		this.players.push(newPlayer);
	}
	
	// Fills the rankedPlayers array
	this.rankPlayers = function() {
		// Store scores
		var scores = [];
		for (key in this.players) {
			scores.push(this.players[key].score);
		}
		// Sort
		var sorted = scores.sort(function(a, b){return b-a});
		// Fill this.rankedPlayers
		for (key in sorted) {
			for (key2 in this.players) {
				if (sorted[key] == this.players[key2].score) {
					this.players[key2].rank = parseInt(key) + 1;
					this.rankedPlayers.push(this.players[key2]);
				}
			}
		}
	}

	// Add note on the array of notes and update its position on the viewPort
	this.addNote = function(note) {

		var newNote = {};
		newNote.name = note;
		newNote.r = this.ballRadius;
		// style attributes
		newNote.verified = false; //set as not verified initially
		newNote.isRight = true; //set the note as right when it is added

		//ATTENTION: The oldest note is in the end of the array
		this.notes.unshift(newNote);
		this.updateShapesPosition();
		
	};

	// Function that randomises the order of the notes in the array
	this.randomize = function() {
		var order = this.randomIntIndexList(this.notes.length, 0, this.notes.length - 1);
		var notesCopy = this.notes.slice();
		for (key in this.notes) {
			this.notes[key] = notesCopy[order[key]];
		}

		//After randomising we have to update the position of the notes inside the array
		this.updateShapesPosition();
	}
	
	// Function that empties the notes array
	this.resetAll = function() {
		this.notes = [];
		this.score = 0;
		this.players = [];
		this.rankedPlayers = [];
	}
	
	// Function that returns an Int array with random values
	this.randomIntIndexList = function(size, min, max) {
		// size must be > (max-min)
		if (size > (max - min + 1)) {
			console.log("Values not accepted in randomIntIndexList()");
			return;
		}
		// min & max included
		var i = 0;
		var randomNum;
		var isAlreadyThere = false;
		var list = [];
		while (i < size) {
			// Generate random number
			randomNum = Math.floor(Math.random()*(max - min + 1) + min);
			// If already in list
			isAlreadyThere = false;
			for (var t = 0; t < list.length; t++) {
				if (randomNum == list[t]) { isAlreadyThere = true; }
			}
			if (!isAlreadyThere) {
				i++;
				list.push(randomNum);
			}
		}
		return list;
	}
	
	// It calculates the cordinates of the shapes on the viewPort
	// and updates the their coordinates
	this.updateShapesPosition = function() {
		var numberNotes = this.notes.length;
		for (var i = 0; i < numberNotes; i++) {
			// Loop coordinate shape values 
			this.notes[i].x = this.ringCenterX + this.ringRadius * Math.cos((i+1)/numberNotes*2*Math.PI + (Math.PI/2));
			this.notes[i].y = this.ringCenterY - this.ringRadius * Math.sin((i+1)/numberNotes*2*Math.PI + (Math.PI/2));
		}
	};
	

///////////////TEST AREA - REMOVE AFTERWARDS///////////

	//Testing score board
	maria = {};
	maria.name = "augusto";
	maria.score = 333;
	maria.rank = null;

	maria2 = {}
	maria2.name = "maria";
	maria2.score = 24523;
	maria2.rank = null;

	maria3 = {};
	maria3.name = "mariama";
	maria3.score = 333333;
	maria3.rank = null;
	
	maria4 = {};
	maria4.name = "sheng";
	maria4.score = 33003;
	maria4.rank = null;
	
	this.players.push(maria);
	this.players.push(maria2);
	this.players.push(maria3);
	this.players.push(maria4);
	this.rankPlayers();
	
///////////////////////////////////////////////////////
	
});
