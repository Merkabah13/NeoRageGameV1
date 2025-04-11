// Dystopian Fighter - A 2D mobile fighting game with dystopian characters
// Main game engine using Phaser 3

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 900 },
        debug: false
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  
  // Initialize game
  const game = new Phaser.Game(config);
  
  // Game variables
  let player;
  let opponent;
  let platforms;
  let healthBars;
  let attackButton;
  let specialButton;
  let blockButton;
  let moveLeftButton;
  let moveRightButton;
  let jumpButton;
  let currentBackground = 0;
  let gameState = 'FIGHT'; // 'FIGHT', 'KO', 'VICTORY'
  let comboCounter = 0;
  let comboTimer = 0;
  let comboText;
  
  // Character data
  const characters = [
    {
      name: 'NeoRazor',
      spritesheet: 'neorazor',
      health: 100,
      speed: 250,
      jumpPower: 600,
      attacks: {
        basic: { damage: 5, cooldown: 300, range: 100 },
        special: { damage: 20, cooldown: 2000, range: 150 }
      }
    },
    {
      name: 'VoxSlasher',
      spritesheet: 'voxslasher',
      health: 120,
      speed: 200,
      jumpPower: 550,
      attacks: {
        basic: { damage: 7, cooldown: 400, range: 90 },
        special: { damage: 25, cooldown: 3000, range: 130 }
      }
    },
    {
      name: 'EchoHex',
      spritesheet: 'echohex',
      health: 90,
      speed: 300,
      jumpPower: 650,
      attacks: {
        basic: { damage: 4, cooldown: 250, range: 110 },
        special: { damage: 18, cooldown: 1800, range: 180 }
      }
    }
  ];
  
  // Backgrounds
  const backgrounds = [
    'ruins-city',
    'neon-district',
    'wasteland'
  ];
  
  // Preload assets
  function preload() {
    // Load character spritesheets
    this.load.spritesheet('neorazor', 'assets/characters/neorazor.png', { frameWidth: 128, frameHeight: 256 });
    this.load.spritesheet('voxslasher', 'assets/characters/voxslasher.png', { frameWidth: 128, frameHeight: 256 });
    this.load.spritesheet('echohex', 'assets/characters/echohex.png', { frameWidth: 128, frameHeight: 256 });
    
    // Load backgrounds
    this.load.image('ruins-city', 'assets/backgrounds/ruins-city.png');
    this.load.image('neon-district', 'assets/backgrounds/neon-district.png');
    this.load.image('wasteland', 'assets/backgrounds/wasteland.png');
    
    // Load UI elements
    this.load.image('health-bar', 'assets/ui/health-bar.png');
    this.load.image('health-bar-bg', 'assets/ui/health-bar-bg.png');
    this.load.image('button-attack', 'assets/ui/button-attack.png');
    this.load.image('button-special', 'assets/ui/button-special.png');
    this.load.image('button-block', 'assets/ui/button-block.png');
    this.load.image('button-left', 'assets/ui/button-left.png');
    this.load.image('button-right', 'assets/ui/button-right.png');
    this.load.image('button-jump', 'assets/ui/button-jump.png');
    
    // Load platform
    this.load.image('platform', 'assets/environment/platform.png');
    
    // Load effects
    this.load.spritesheet('hit-effect', 'assets/effects/hit-effect.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('special-effect', 'assets/effects/special-effect.png', { frameWidth: 192, frameHeight: 192 });
    
    // Load audio
    this.load.audio('theme', 'assets/audio/dystopian-theme.mp3');
    this.load.audio('hit', 'assets/audio/hit.mp3');
    this.load.audio('special', 'assets/audio/special.mp3');
    this.load.audio('jump', 'assets/audio/jump.mp3');
    this.load.audio('ko', 'assets/audio/ko.mp3');
  }
  
  // Create game objects
  function create() {
    // Add background
    this.background = this.add.image(640, 360, backgrounds[currentBackground]);
    this.background.setScale(1.2);
    
    // Add platforms
    platforms = this.physics.add.staticGroup();
    platforms.create(640, 700, 'platform').setScale(2).refreshBody();
    
    // Create player and opponent
    const playerChar = characters[0];
    const opponentChar = characters[1];
    
    player = createFighter(this, 300, 450, playerChar, true);
    opponent = createFighter(this, 980, 450, opponentChar, false);
    
    // Set up collision
    this.physics.add.collider(player.sprite, platforms);
    this.physics.add.collider(opponent.sprite, platforms);
    
    // Create health bars
    healthBars = {
      player: {
        bg: this.add.image(200, 50, 'health-bar-bg').setScale(2),
        bar: this.add.image(200, 50, 'health-bar').setScale(2)
      },
      opponent: {
        bg: this.add.image(1080, 50, 'health-bar-bg').setScale(2),
        bar: this.add.image(1080, 50, 'health-bar').setScale(2)
      }
    };
    
    // Create mobile controls
    createMobileControls(this);
    
    // Setup animations
    createAnimations(this);
    
    // Add collision for attacks
    this.physics.add.overlap(player.attackHitbox, opponent.sprite, (hitbox, target) => {
      if (player.attacking && !opponent.blocking) {
        hitOpponent(this, player, opponent);
      }
    });
    
    this.physics.add.overlap(opponent.attackHitbox, player.sprite, (hitbox, target) => {
      if (opponent.attacking && !player.blocking) {
        hitOpponent(this, opponent, player);
      }
    });
    
    // Add combo text
    comboText = this.add.text(640, 200, '', { 
      fontSize: '48px', 
      fontFamily: 'Impact', 
      fill: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
    comboText.setVisible(false);
    
    // Play background music
    this.sound.play('theme', { loop: true, volume: 0.5 });
    
    // Enemy AI
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (gameState === 'FIGHT') {
          opponentAI(this, opponent, player);
        }
      },
      callbackScope: this,
      loop: true
    });
  }
  
  // Update game state
  function update(time, delta) {
    if (gameState === 'FIGHT') {
      // Update player
      updateFighter(this, player);
      
      // Update opponent
      updateFighter(this, opponent);
      
      // Update health bars
      updateHealthBars();
      
      // Update combo system
      if (comboCounter > 0) {
        comboTimer -= delta;
        if (comboTimer <= 0) {
          comboCounter = 0;
          comboText.setVisible(false);
        }
      }
      
      // Check for KO
      if (player.health <= 0 || opponent.health <= 0) {
        gameState = 'KO';
        this.sound.play('ko');
        this.time.delayedCall(2000, () => {
          gameState = 'VICTORY';
          // Show victory screen
          const winner = player.health <= 0 ? 'OPPONENT' : 'PLAYER';
          const victoryText = this.add.text(640, 300, `${winner} WINS`, {
            fontSize: '72px',
            fontFamily: 'Impact',
            fill: '#ffff00',
            stroke: '#ff0000',
            strokeThickness: 8
          }).setOrigin(0.5);
          
          // Add restart button
          const restartButton = this.add.text(640, 450, 'FIGHT AGAIN', {
            fontSize: '48px',
            fontFamily: 'Impact',
            fill: '#ffffff',
            backgroundColor: '#aa0000',
            padding: { x: 20, y: 10 }
          }).setOrigin(0.5).setInteractive();
          
          restartButton.on('pointerdown', () => {
            // Restart the game
            this.scene.restart();
            gameState = 'FIGHT';
          });
        });
      }
    }
  }
  
  // Create a fighter character
  function createFighter(scene, x, y, characterData, isPlayer) {
    const sprite = scene.physics.add.sprite(x, y, characterData.spritesheet);
    sprite.setScale(1.5);
    sprite.setBounce(0.2);
    sprite.setCollideWorldBounds(true);
    
    // Add attack hitbox
    const attackHitbox = scene.physics.add.sprite(x + (isPlayer ? 75 : -75), y, null);
    attackHitbox.setSize(100, 150);
    attackHitbox.setVisible(false);
    attackHitbox.setActive(false);
    
    return {
      sprite: sprite,
      attackHitbox: attackHitbox,
      name: characterData.name,
      health: characterData.health,
      maxHealth: characterData.health,
      speed: characterData.speed,
      jumpPower: characterData.jumpPower,
      attacks: characterData.attacks,
      isPlayer: isPlayer,
      facingRight: isPlayer,
      attacking: false,
      blocking: false,
      attackCooldown: 0,
      specialCooldown: 0
    };
  }
  
  // Update fighter state
  function updateFighter(scene, fighter) {
    // Update hitbox position
    fighter.attackHitbox.x = fighter.sprite.x + (fighter.facingRight ? 75 : -75);
    fighter.attackHitbox.y = fighter.sprite.y;
    
    // Decrease cooldowns
    if (fighter.attackCooldown > 0) fighter.attackCooldown -= 16;
    if (fighter.specialCooldown > 0) fighter.specialCooldown -= 16;
    
    // Update animation
    if (fighter.attacking) {
      // Animation is handled in the attack function
    } else if (fighter.blocking) {
      fighter.sprite.anims.play(`${fighter.name.toLowerCase()}-block`, true);
    } else if (!fighter.sprite.body.touching.down) {
      fighter.sprite.anims.play(`${fighter.name.toLowerCase()}-jump`, true);
    } else if (
      (fighter.isPlayer && (moveLeftButton.isDown || moveRightButton.isDown)) ||
      (!fighter.isPlayer && fighter.sprite.body.velocity.x !== 0)
    ) {
      fighter.sprite.anims.play(`${fighter.name.toLowerCase()}-run`, true);
    } else {
      fighter.sprite.anims.play(`${fighter.name.toLowerCase()}-idle`, true);
    }
    
    // Update facing direction
    if (fighter.sprite.body.velocity.x > 0) {
      fighter.facingRight = true;
      fighter.sprite.setFlipX(false);
    } else if (fighter.sprite.body.velocity.x < 0) {
      fighter.facingRight = false;
      fighter.sprite.setFlipX(true);
    }
    
    // Player controls
    if (fighter.isPlayer) {
      fighter.sprite.setVelocityX(0);
      
      if (!fighter.attacking && !fighter.blocking) {
        if (moveLeftButton.isDown) {
          fighter.sprite.setVelocityX(-fighter.speed);
        } else if (moveRightButton.isDown) {
          fighter.sprite.setVelocityX(fighter.speed);
        }
        
        if (jumpButton.isDown && fighter.sprite.body.touching.down) {
          fighter.sprite.setVelocityY(-fighter.jumpPower);
          scene.sound.play('jump', { volume: 0.5 });
        }
      }
    }
  }
  
  // Create mobile controls
  function createMobileControls(scene) {
    // Movement buttons
    moveLeftButton = scene.add.image(150, 600, 'button-left').setInteractive().setScale(1.5);
    moveRightButton = scene.add.image(300, 600, 'button-right').setInteractive().setScale(1.5);
    jumpButton = scene.add.image(225, 500, 'button-jump').setInteractive().setScale(1.5);
    
    // Attack buttons
    attackButton = scene.add.image(980, 600, 'button-attack').setInteractive().setScale(1.5);
    specialButton = scene.add.image(1130, 600, 'button-special').setInteractive().setScale(1.5);
    blockButton = scene.add.image(1055, 500, 'button-block').setInteractive().setScale(1.5);
    
    // Button events
    moveLeftButton.on('pointerdown', () => { moveLeftButton.isDown = true; });
    moveLeftButton.on('pointerup', () => { moveLeftButton.isDown = false; });
    moveLeftButton.on('pointerout', () => { moveLeftButton.isDown = false; });
    
    moveRightButton.on('pointerdown', () => { moveRightButton.isDown = true; });
    moveRightButton.on('pointerup', () => { moveRightButton.isDown = false; });
    moveRightButton.on('pointerout', () => { moveRightButton.isDown = false; });
    
    jumpButton.on('pointerdown', () => { jumpButton.isDown = true; });
    jumpButton.on('pointerup', () => { jumpButton.isDown = false; });
    jumpButton.on('pointerout', () => { jumpButton.isDown = false; });
    
    attackButton.on('pointerdown', () => {
      if (!player.attacking && !player.blocking && player.attackCooldown <= 0) {
        performAttack(scene, player, 'basic');
      }
    });
    
    specialButton.on('pointerdown', () => {
      if (!player.attacking && !player.blocking && player.specialCooldown <= 0) {
        performAttack(scene, player, 'special');
      }
    });
    
    blockButton.on('pointerdown', () => {
      player.blocking = true;
    });
    
    blockButton.on('pointerup', () => {
      player.blocking = false;
    });
    
    blockButton.on('pointerout', () => {
      player.blocking = false;
    });
  }
  
  // Create character animations
  function createAnimations(scene) {
    characters.forEach(char => {
      const name = char.name.toLowerCase();
      
      scene.anims.create({
        key: `${name}-idle`,
        frames: scene.anims.generateFrameNumbers(name, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
      
      scene.anims.create({
        key: `${name}-run`,
        frames: scene.anims.generateFrameNumbers(name, { start: 4, end: 9 }),
        frameRate: 10,
        repeat: -1
      });
      
      scene.anims.create({
        key: `${name}-jump`,
        frames: scene.anims.generateFrameNumbers(name, { start: 10, end: 12 }),
        frameRate: 8,
        repeat: 0
      });
      
      scene.anims.create({
        key: `${name}-attack`,
        frames: scene.anims.generateFrameNumbers(name, { start: 13, end: 16 }),
        frameRate: 12,
        repeat: 0
      });
      
      scene.anims.create({
        key: `${name}-special`,
        frames: scene.anims.generateFrameNumbers(name, { start: 17, end: 22 }),
        frameRate: 10,
        repeat: 0
      });
      
      scene.anims.create({
        key: `${name}-block`,
        frames: scene.anims.generateFrameNumbers(name, { start: 23, end: 24 }),
        frameRate: 8,
        repeat: 0
      });
      
      scene.anims.create({
        key: `${name}-hit`,
        frames: scene.anims.generateFrameNumbers(name, { start: 25, end: 27 }),
        frameRate: 8,
        repeat: 0
      });
    });
    
    // Effect animations
    scene.anims.create({
      key: 'hit-effect',
      frames: scene.anims.generateFrameNumbers('hit-effect', { start: 0, end: 5 }),
      frameRate: 15,
      repeat: 0
    });
    
    scene.anims.create({
      key: 'special-effect',
      frames: scene.anims.generateFrameNumbers('special-effect', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: 0
    });
  }
  
  // Perform fighter attack
  function performAttack(scene, attacker, attackType) {
    attacker.attacking = true;
    
    // Play animation
    const animKey = `${attacker.name.toLowerCase()}-${attackType}`;
    attacker.sprite.anims.play(animKey);
    
    // Set attack cooldown
    if (attackType === 'basic') {
      attacker.attackCooldown = attacker.attacks.basic.cooldown;
    } else {
      attacker.specialCooldown = attacker.attacks.special.cooldown;
    }
    
    // Enable hitbox
    attacker.attackHitbox.setActive(true);
    
    // Play sound
    scene.sound.play(attackType === 'basic' ? 'hit' : 'special', { volume: 0.7 });
    
    // Show effect
    const effectX = attacker.sprite.x + (attacker.facingRight ? 100 : -100);
    const effectY = attacker.sprite.y - 30;
    
    if (attackType === 'special') {
      const specialEffect = scene.physics.add.sprite(effectX, effectY, 'special-effect');
      specialEffect.setFlipX(!attacker.facingRight);
      specialEffect.anims.play('special-effect');
      specialEffect.on('animationcomplete', () => {
        specialEffect.destroy();
      });
    }
    
    // Reset state after animation completes
    attacker.sprite.on('animationcomplete', function(anim, frame) {
      if (anim.key === animKey) {
        attacker.attacking = false;
        attacker.attackHitbox.setActive(false);
      }
    }, scene);
  }
  
  // Handle opponent getting hit
  function hitOpponent(scene, attacker, defender) {
    const attackType = attacker.attackCooldown > 0 ? 'basic' : 'special';
    const damage = attacker.attacks[attackType].damage;
    
    // Reduce health
    defender.health -= damage;
    if (defender.health < 0) defender.health = 0;
    
    // Play hit animation
    defender.sprite.anims.play(`${defender.name.toLowerCase()}-hit`);
    
    // Show hit effect
    const hitEffect = scene.physics.add.sprite(defender.sprite.x, defender.sprite.y - 50, 'hit-effect');
    hitEffect.anims.play('hit-effect');
    hitEffect.on('animationcomplete', () => {
      hitEffect.destroy();
    });
    
    // Apply knockback
    const knockbackDirection = attacker.facingRight ? 1 : -1;
    defender.sprite.setVelocityX(knockbackDirection * (attackType === 'basic' ? 200 : 400));
    defender.sprite.setVelocityY(-200);
    
    // Update combo counter
    if (attacker.isPlayer) {
      comboCounter++;
      comboTimer = 2000;
      if (comboCounter > 1) {
        comboText.setText(`${comboCounter} HIT COMBO!`);
        comboText.setVisible(true);
        comboText.setScale(1 + (comboCounter * 0.05));
      }
    }
  }
  
  // Update health bars
  function updateHealthBars() {
    // Player health bar
    const playerHealthPercent = player.health / player.maxHealth;
    healthBars.player.bar.setScale(2 * playerHealthPercent, 2);
    healthBars.player.bar.setOrigin(0, 0.5);
    healthBars.player.bar.x = 100;
    
    // Opponent health bar
    const opponentHealthPercent = opponent.health / opponent.maxHealth;
    healthBars.opponent.bar.setScale(2 * opponentHealthPercent, 2);
    healthBars.opponent.bar.setOrigin(1, 0.5);
    healthBars.opponent.bar.x = 1180 - (200 - 200 * opponentHealthPercent);
  }
  
  // Simple AI for opponent
  function opponentAI(scene, opponent, player) {
    if (gameState !== 'FIGHT') return;
    
    // Reset velocity
    opponent.sprite.setVelocityX(0);
    
    // Calculate distance to player
    const distance = Math.abs(player.sprite.x - opponent.sprite.x);
    const direction = player.sprite.x > opponent.sprite.x ? 1 : -1;
    
    // Make decisions based on distance
    const decisionRoll = Math.random();
    
    if (distance > 300) {
      // Move towards player
      opponent.sprite.setVelocityX(direction * opponent.speed);
    } else if (distance > 150) {
      if (decisionRoll < 0.6) {
        // Move towards player
        opponent.sprite.setVelocityX(direction * opponent.speed);
      } else if (decisionRoll < 0.8) {
        // Jump
        if (opponent.sprite.body.touching.down) {
          opponent.sprite.setVelocityY(-opponent.jumpPower);
          scene.sound.play('jump', { volume: 0.3 });
        }
      } else {
        // Basic attack
        if (!opponent.attacking && opponent.attackCooldown <= 0) {
          performAttack(scene, opponent, 'basic');
        }
      }
    } else {
      if (decisionRoll < 0.5) {
        // Basic attack
        if (!opponent.attacking && opponent.attackCooldown <= 0) {
          performAttack(scene, opponent, 'basic');
        }
      } else if (decisionRoll < 0.7) {
        // Special attack
        if (!opponent.attacking && opponent.specialCooldown <= 0) {
          performAttack(scene, opponent, 'special');
        }
      } else if (decisionRoll < 0.9) {
        // Block
        opponent.blocking = true;
        scene.time.delayedCall(500, () => {
          opponent.blocking = false;
        });
      } else {
        // Back away
        opponent.sprite.setVelocityX(-direction * opponent.speed);
      }
    }
  }