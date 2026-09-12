"use strict";

const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
const scoreBoard = document.createElement("div");
const helpText = document.createElement("div");
const livesBoard = document.createElement("div");
const runSprites = Array.from({ length: 8 }, (_, index) => {
	const sprite = new Image();
	sprite.src = `player/Run (${index + 1}).png`;
	return sprite;
});
const jumpSprites = Array.from({ length: 12 }, (_, index) => {
	const sprite = new Image();
	sprite.src = `player/Jump (${index + 1}).png`;
	return sprite;
});
const deadSprites = Array.from({ length: 10 }, (_, index) => {
	const sprite = new Image();
	sprite.src = `player/Dead (${index + 1}).png`;
	return sprite;
});

document.title = "Cube Dash";
document.body.innerHTML = "";
document.body.style.cssText = "margin:0; overflow:hidden; background:#08111f; font-family:system-ui, sans-serif; color:#f6f7fb;";
document.body.append(canvas, scoreBoard, livesBoard, helpText);

scoreBoard.textContent = "SCORE 00000";
scoreBoard.style.cssText = "position:fixed; top:22px; left:50%; transform:translateX(-50%); z-index:2; font:700 20px monospace; letter-spacing:2px; color:#f6f7fb; text-shadow:0 2px 8px #0008;";
livesBoard.style.cssText = "position:fixed; top:22px; left:24px; z-index:2; font:700 25px sans-serif; letter-spacing:4px; color:#ff6b6b; text-shadow:0 2px 8px #0008;";
helpText.textContent = "SPACE / UP / TAP to jump";
helpText.style.cssText = "position:fixed; bottom:18px; left:50%; transform:translateX(-50%); z-index:2; color:#a9b7ca; font-size:13px; letter-spacing:1px; text-align:center;";

const world = {
	width: 960,
	height: 540,
	ground: 430,
	speed: 360,
	score: 0,
	best: Number(localStorage.getItem("cubeDashBest") || 0),
	lives: 3,
	gameOver: false,
	dead: false,
	deadAnimationTime: 0,
	hitCooldown: 0,
	lastTime: 0,
	animationTime: 0,
	backgroundOffset: 0,
	obstacleTimer: 0,
	nextObstacle: 1.1,
};

const player = {
	x: 145,
	y: world.ground - 54,
	size: 54,
	velocityY: 0,
	jumpPower: -700,
	grounded: true,
};

const obstacles = [];
const keys = new Set();

function resizeCanvas() {
	const ratio = Math.min(window.innerWidth / world.width, window.innerHeight / world.height);
	canvas.width = world.width;
	canvas.height = world.height;
	canvas.style.cssText = `display:block; width:${world.width * ratio}px; height:${world.height * ratio}px; position:absolute; left:50%; top:50%; transform:translate(-50%, -50%);`;
}

function resetGame() {
	world.score = 0;
	world.speed = 360;
	world.lives = 3;
	world.gameOver = false;
	world.dead = false;
	world.deadAnimationTime = 0;
	world.hitCooldown = 0;
	world.backgroundOffset = 0;
	world.obstacleTimer = 0;
	world.nextObstacle = 1.1;
	player.y = world.ground - player.size;
	player.velocityY = 0;
	player.grounded = true;
	obstacles.length = 0;
	updateScore();
	updateLives();
}

function jump() {
	if (world.gameOver) {
		resetGame();
		return;
	}
	if (player.grounded) {
		player.velocityY = player.jumpPower;
		player.grounded = false;
	}
}

function spawnObstacle() {
	const height = 40 + Math.random() * 34;
	obstacles.push({
		x: world.width + 20,
		y: world.ground - height,
		width: 38 + Math.random() * 18,
		height,
		passed: false,
	});
	world.nextObstacle = 0.85 + Math.random() * 1.1;
}

function update(delta) {
	if (world.gameOver) return;
	world.hitCooldown = Math.max(0, world.hitCooldown - delta);

	if (world.dead) {
		world.deadAnimationTime += delta;
		if (world.deadAnimationTime >= deadSprites.length / 10) endGame();
		return;
	}

	world.animationTime += delta;
	world.speed = Math.min(560, 360 + world.score * 0.6);
	world.score += world.speed * delta / 36;
	world.backgroundOffset = (world.backgroundOffset + world.speed * 0.12 * delta) % (world.width + 260);
	world.obstacleTimer += delta;
	if (world.obstacleTimer >= world.nextObstacle) {
		world.obstacleTimer = 0;
		spawnObstacle();
	}

	player.velocityY += 1800 * delta;
	player.y += player.velocityY * delta;
	if (player.y + player.size >= world.ground) {
		player.y = world.ground - player.size;
		player.velocityY = 0;
		player.grounded = true;
	}

	for (const obstacle of obstacles) {
		obstacle.x -= world.speed * delta;
		if (world.hitCooldown === 0 && collides(player, obstacle)) playerHit();
	}
	while (obstacles.length && obstacles[0].x + obstacles[0].width < -20) obstacles.shift();
	updateScore();
}

function playerHit() {
	world.lives -= 1;
	world.hitCooldown = 1.25;
	player.y = world.ground - player.size;
	player.velocityY = 0;
	player.grounded = true;
	updateLives();
	if (world.lives === 0) {
		world.dead = true;
		world.deadAnimationTime = 0;
		world.best = Math.max(world.best, Math.floor(world.score));
		localStorage.setItem("cubeDashBest", String(world.best));
		updateScore();
	}
}

function collides(cube, triangle) {
	const padding = 8;
	return cube.x + padding < triangle.x + triangle.width &&
		cube.x + cube.size - padding > triangle.x &&
		cube.y + padding < triangle.y + triangle.height &&
		cube.y + cube.size - padding > triangle.y + 8;
}

function endGame() {
	world.gameOver = true;
	world.best = Math.max(world.best, Math.floor(world.score));
	localStorage.setItem("cubeDashBest", String(world.best));
	updateScore();
}

function updateScore() {
	const score = String(Math.floor(world.score)).padStart(5, "0");
	scoreBoard.textContent = world.gameOver ? `GAME OVER  ${score}  |  BEST ${world.best}` : `SCORE ${score}  |  BEST ${world.best}`;
}

function updateLives() {
	livesBoard.textContent = `${"❤".repeat(world.lives)}${"♡".repeat(3 - world.lives)}`;
}

function draw() {
	const gradient = context.createLinearGradient(0, 0, 0, world.height);
	gradient.addColorStop(0, "#101d38");
	gradient.addColorStop(1, "#162b36");
	context.fillStyle = gradient;
	context.fillRect(0, 0, world.width, world.height);

	drawBackground();

	drawCube();
	for (const obstacle of obstacles) drawTriangle(obstacle);

	if (world.gameOver) {
		context.fillStyle = "#08111f99";
		context.fillRect(0, 0, world.width, world.height);
		context.textAlign = "center";
		context.fillStyle = "#f6f7fb";
		context.font = "700 48px system-ui";
		context.fillText("RUN ENDED", world.width / 2, 220);
		context.font = "18px system-ui";
		context.fillStyle = "#a9b7ca";
		context.fillText("Press SPACE or tap to try again", world.width / 2, 260);
	}
}

function drawBackground() {
	const cloudSpacing = world.width + 260;
	const clouds = [
		{ x: 120, y: 105, scale: 1.1 },
		{ x: 520, y: 165, scale: 0.8 },
		{ x: 850, y: 85, scale: 1.35 },
	];
	for (const cloud of clouds) {
		for (let copy = -1; copy <= 1; copy++) {
			drawCloud(cloud.x - world.backgroundOffset + copy * cloudSpacing, cloud.y, cloud.scale);
		}
	}

	context.fillStyle = "#0b1726";
	context.fillRect(0, world.ground, world.width, world.height - world.ground);
	context.strokeStyle = "#f6f7fb";
	context.lineWidth = 4;
	context.beginPath();
	context.moveTo(0, world.ground);
	context.lineTo(world.width, world.ground);
	context.stroke();

	context.fillStyle = "#ffffff18";
	for (let x = 0; x < world.width; x += 42) {
		context.fillRect(x - (world.score * 8 % 42), world.ground + 28, 20, 3);
	}
}

function drawCloud(x, y, scale) {
	if (x < -180 || x > world.width + 180) return;
	context.save();
	context.translate(x, y);
	context.scale(scale, scale);
	context.fillStyle = "#dcecff2b";
	context.beginPath();
	context.arc(0, 14, 22, 0, Math.PI * 2);
	context.arc(25, 2, 30, 0, Math.PI * 2);
	context.arc(58, 14, 22, 0, Math.PI * 2);
	context.roundRect(-22, 14, 102, 25, 12);
	context.fill();
	context.restore();
}

function drawCube() {
	context.save();
	context.translate(player.x + player.size / 2, player.y + player.size / 2);
	context.rotate(player.grounded ? 0 : player.velocityY * 0.0003);
	const sprite = world.dead
		? deadSprites[Math.min(Math.floor(world.deadAnimationTime * 10), deadSprites.length - 1)]
		: player.grounded
			? runSprites[Math.floor(world.animationTime * 10) % runSprites.length]
			: jumpSprites[Math.floor(world.animationTime * 12) % jumpSprites.length];
	if (sprite.complete && sprite.naturalWidth > 0) {
		context.drawImage(sprite, -player.size / 2, -player.size / 2, player.size, player.size);
	}
	context.restore();
}

function drawTriangle(obstacle) {
	context.beginPath();
	context.moveTo(obstacle.x, world.ground);
	context.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
	context.lineTo(obstacle.x + obstacle.width, world.ground);
	context.closePath();
	context.fillStyle = "#ff6b6b";
	context.fill();
	context.strokeStyle = "#ffd0a8";
	context.lineWidth = 3;
	context.stroke();
}

function frame(timestamp) {
	const delta = Math.min((timestamp - world.lastTime) / 1000 || 0, 0.035);
	world.lastTime = timestamp;
	update(delta);
	draw();
	requestAnimationFrame(frame);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
	if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
		event.preventDefault();
		if (!keys.has(event.code)) jump();
		keys.add(event.code);
	}
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("pointerdown", jump);

resizeCanvas();
resetGame();
requestAnimationFrame(frame);
