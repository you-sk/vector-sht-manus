/**
 * 宇宙の防衛者 - 弾幕シューティングゲーム
 * メインゲームスクリプト
 */

// ゲームの状態を管理する定数
const GameState = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// 敵の種類を定義する定数
const EnemyType = {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
    BOSS: 'boss'
};

// 弾幕パターンの種類を定義する定数
const BulletPatternType = {
    SINGLE: 'single',
    STRAIGHT: 'straight',
    CIRCLE: 'circle',
    SPIRAL: 'spiral',
    RANDOM: 'random'
};

// ゲームクラス
class Game {
    constructor() {
        // キャンバスの設定
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // ゲーム状態の初期化
        this.state = GameState.START;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        
        // グレイズシステム
        this.grazeCount = 0;
        this.grazeBonus = 10; // グレイズごとの基本ボーナス点
        
        // コンボシステム
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.comboTimeout = 2000; // 2秒でコンボリセット
        this.maxComboMultiplier = 10;
        
        // 画面要素
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.finalScoreElement = document.getElementById('final-score');
        this.scoreValueElement = document.getElementById('score-value');
        this.livesValueElement = document.getElementById('lives-value');
        this.levelValueElement = document.getElementById('level-value');
        this.powerLevelElement = document.getElementById('power-level');
        this.grazeValueElement = document.getElementById('graze-value');
        this.comboValueElement = document.getElementById('combo-value');
        
        // ゲームオブジェクト
        this.player = null;
        this.enemies = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.powerUps = [];
        this.explosions = []; // 爆発エフェクト
        this.grazeEffects = []; // グレイズエフェクト
        
        // 背景の星
        this.stars = [];
        this.initStars();
        
        // 時間管理
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000; // ミリ秒
        this.bossSpawnTimer = 0;
        this.bossSpawnInterval = 30000; // ミリ秒（30秒ごとにボス）
        
        // キー状態の管理
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            ' ': false, // スペースキー
            'p': false, // Pキー（一時停止）
            'P': false // Pキー（大文字）
        };
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // 初期画面の表示
        this.showStartScreen();
        
        // キャンバスにゲームインスタンスを関連付け
        this.canvas.game = this;
    }
    
    // 星の初期化
    initStars() {
        // 3層の星を作成（遠い、中間、近い）
        for (let layer = 0; layer < 3; layer++) {
            const count = 50; // 各層の星の数
            const speed = (layer + 1) * 0.5; // 層に応じた速度
            const size = (layer + 1) * 1; // 層に応じたサイズ
            const brightness = 0.5 + layer * 0.25; // 層に応じた明るさ
            
            for (let i = 0; i < count; i++) {
                this.stars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    size: size,
                    speed: speed,
                    brightness: brightness
                });
            }
        }
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        // スタートボタン
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('ゲーム開始ボタンがクリックされました');
                this.startGame();
            });
        } else {
            console.error('スタートボタンが見つかりません');
        }
        
        // リトライボタン
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.resetGame();
                this.startGame();
            });
        }
        
        // 再開ボタン
        const resumeButton = document.getElementById('resume-button');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => {
                this.resumeGame();
            });
        }
        
        // キーボード入力
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        window.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    
    // キーダウンイベントの処理
    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            e.preventDefault();
            this.keys[e.key] = true;
            
            // 一時停止/再開のトグル
            if ((e.key === 'p' || e.key === 'P') && this.state !== GameState.START && this.state !== GameState.GAME_OVER) {
                if (this.state === GameState.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GameState.PAUSED) {
                    this.resumeGame();
                }
            }
        }
    }
    
    // キーアップイベントの処理
    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            e.preventDefault();
            this.keys[e.key] = false;
        }
    }
    
    // ゲーム開始画面の表示
    showStartScreen() {
        this.startScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
    }
    
    // ゲームオーバー画面の表示
    showGameOverScreen() {
        this.gameOverScreen.classList.remove('hidden');
        this.finalScoreElement.textContent = this.score;
    }
    
    // 一時停止画面の表示
    showPauseScreen() {
        this.pauseScreen.classList.remove('hidden');
    }
    
    // ゲームの開始
    startGame() {
        console.log('ゲームを開始します');
        this.state = GameState.PLAYING;
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        
        // プレイヤーの初期化
        this.player = new Player(this);
        
        // ゲームループの開始
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // ゲームの一時停止
    pauseGame() {
        this.state = GameState.PAUSED;
        this.showPauseScreen();
    }
    
    // ゲームの再開
    resumeGame() {
        this.state = GameState.PLAYING;
        this.pauseScreen.classList.add('hidden');
        
        // ゲームループの再開
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // ゲームのリセット
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.grazeCount = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
        this.enemies = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.powerUps = [];
        this.explosions = [];
        this.grazeEffects = [];
        this.enemySpawnTimer = 0;
        this.bossSpawnTimer = 0;
        
        // UI更新
        this.updateUI();
    }
    
    // ゲームオーバー処理
    gameOver() {
        this.state = GameState.GAME_OVER;
        this.showGameOverScreen();
    }
    
    // UI要素の更新
    updateUI() {
        this.scoreValueElement.textContent = this.score;
        this.livesValueElement.textContent = this.lives;
        this.levelValueElement.textContent = this.level;
        this.grazeValueElement.textContent = this.grazeCount;
        this.comboValueElement.textContent = `x${this.comboMultiplier}`;
        
        // パワーレベルの表示更新
        if (this.player) {
            const powerPercentage = (this.player.powerLevel / 3) * 100;
            this.powerLevelElement.style.width = `${powerPercentage}%`;
        }
        
        // コンボ倍率に応じて色を変更
        if (this.comboMultiplier >= 8) {
            this.comboValueElement.style.color = '#FF00FF';
        } else if (this.comboMultiplier >= 5) {
            this.comboValueElement.style.color = '#FF0000';
        } else if (this.comboMultiplier >= 3) {
            this.comboValueElement.style.color = '#FFFF00';
        } else {
            this.comboValueElement.style.color = '#FFFFFF';
        }
    }
    
    // ゲームループ
    gameLoop(timestamp) {
        // 経過時間の計算
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (this.state === GameState.PLAYING) {
            // ゲーム状態の更新
            this.update(deltaTime);
            
            // 描画
            this.render();
            
            // 次のフレームをリクエスト
            requestAnimationFrame(this.gameLoop.bind(this));
        } else if (this.state === GameState.PAUSED) {
            // 一時停止中は描画のみ行う
            this.render();
            // 次のフレームはリクエストしない
        }
    }
    
    // ゲーム状態の更新
    update(deltaTime) {
        // 背景の星の更新
        this.updateStars(deltaTime);
        
        // 敵の生成
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
            
            // レベルに応じて敵の出現間隔を短くする
            this.enemySpawnInterval = Math.max(500, 2000 - (this.level - 1) * 100);
        }
        
        // ボスの生成
        this.bossSpawnTimer += deltaTime;
        if (this.bossSpawnTimer > this.bossSpawnInterval) {
            this.spawnBoss();
            this.bossSpawnTimer = 0;
        }
        
        // プレイヤーの更新
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // 敵の更新と削除
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);
            return enemy.y <= this.height + enemy.height; // 画面外に出た敵を削除
        });
        
        // プレイヤーの弾の更新と削除
        this.playerBullets = this.playerBullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y >= -bullet.height; // 画面外に出た弾を削除
        });
        
        // 敵の弾の更新と削除
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update(deltaTime);
            return (
                bullet.y <= this.height + bullet.height &&
                bullet.x >= -bullet.width &&
                bullet.x <= this.width + bullet.width
            ); // 画面外に出た弾を削除
        });
        
        // パワーアップアイテムの更新と削除
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update(deltaTime);
            return powerUp.y <= this.height + powerUp.height; // 画面外に出たアイテムを削除
        });
        
        // 爆発エフェクトの更新と削除
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(deltaTime);
            return !explosion.isFinished(); // 終了した爆発エフェクトを削除
        });
        
        // グレイズエフェクトの更新と削除
        this.grazeEffects = this.grazeEffects.filter(effect => {
            effect.update(deltaTime);
            return !effect.isFinished();
        });
        
        // コンボタイマーの更新
        if (this.combo > 0) {
            this.comboTimer += deltaTime;
            if (this.comboTimer >= this.comboTimeout) {
                this.resetCombo();
            }
        }
        
        // 衝突判定
        this.checkCollisions();
        
        // UI更新
        this.updateUI();
    }
    
    // 敵の生成
    spawnEnemy() {
        // レベルに応じて敵の種類を決定
        let enemyType;
        const rand = Math.random();
        
        if (rand < 0.6) {
            enemyType = EnemyType.SMALL;
        } else if (rand < 0.9) {
            enemyType = EnemyType.MEDIUM;
        } else {
            enemyType = EnemyType.LARGE;
        }
        
        // 敵の生成位置をランダムに決定
        const x = Math.random() * (this.width - 50) + 25;
        const y = -50; // 画面上部から出現
        
        // 敵を生成
        const enemy = new Enemy(this, x, y, enemyType);
        this.enemies.push(enemy);
    }
    
    // ボスの生成
    spawnBoss() {
        // ボスの生成位置
        const x = this.width / 2;
        const y = -100; // 画面上部から出現
        
        // ボスを生成
        const boss = new Enemy(this, x, y, EnemyType.BOSS);
        this.enemies.push(boss);
    }
    
    // 背景の星の更新
    updateStars(deltaTime) {
        this.stars.forEach(star => {
            // 星を下に移動（スクロール効果）
            star.y += star.speed;
            
            // 画面外に出た星を上に戻す
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        });
    }
    
    // 衝突判定
    checkCollisions() {
        if (!this.player) return;
        
        // プレイヤーと敵の弾の衝突判定とグレイズ判定
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            const playerHitbox = {
                x: this.player.x + this.player.width / 4,
                y: this.player.y + this.player.height / 4,
                width: this.player.width / 2,
                height: this.player.height / 2
            };
            
            // グレイズ判定（弾がプレイヤーの近くを通った場合）
            const grazeDistance = 20; // グレイズ範囲
            const grazeBox = {
                x: this.player.x - grazeDistance,
                y: this.player.y - grazeDistance,
                width: this.player.width + grazeDistance * 2,
                height: this.player.height + grazeDistance * 2
            };
            
            if (!bullet.grazed && this.isColliding(bullet, grazeBox) && !this.isColliding(bullet, playerHitbox)) {
                // グレイズ成功
                bullet.grazed = true;
                this.graze(bullet);
            }
            
            if (this.isColliding(bullet, playerHitbox) && !this.player.invincible) {
                this.player.takeDamage();
                this.createExplosion(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    '#00FFFF'
                );
                return false; // 弾を削除
            }
            return true; // 弾を保持
        });
        
        // プレイヤーの弾と敵の衝突判定
        this.playerBullets = this.playerBullets.filter(bullet => {
            let hitEnemy = false;
            this.enemies = this.enemies.filter(enemy => {
                if (this.isColliding(bullet, enemy)) {
                    const destroyed = enemy.takeDamage();
                    if (destroyed) {
                        this.createExplosion(
                            enemy.x + enemy.width / 2,
                            enemy.y + enemy.height / 2,
                            enemy.color
                        );
                        // コンボの継続
                        this.continueCombo();
                        // 敵が撃破されたら削除
                        return false;
                    }
                    hitEnemy = true;
                }
                return true; // 敵を保持
            });
            
            return !hitEnemy; // 敵に当たった弾を削除
        });
        
        // プレイヤーとパワーアップアイテムの衝突判定
        this.powerUps = this.powerUps.filter(powerUp => {
            if (this.isColliding(powerUp, this.player)) {
                this.player.powerUp();
                this.createExplosion(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    '#00FF00'
                );
                return false; // アイテムを削除
            }
            return true; // アイテムを保持
        });
    }
    
    // 衝突判定関数
    isColliding(obj1, obj2) {
        return (
            obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y
        );
    }
    
    // 爆発エフェクトの生成
    createExplosion(x, y, color) {
        const explosion = new Explosion(this, x, y, color);
        this.explosions.push(explosion);
    }
    
    // グレイズエフェクトの生成
    createGrazeEffect(x, y) {
        const effect = new GrazeEffect(this, x, y);
        this.grazeEffects.push(effect);
    }
    
    // 描画処理
    render() {
        // キャンバスのクリア
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 背景の描画
        this.drawBackground();
        
        // プレイヤーの描画
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        // 敵の描画
        this.enemies.forEach(enemy => {
            enemy.draw(this.ctx);
        });
        
        // プレイヤーの弾の描画
        this.playerBullets.forEach(bullet => {
            bullet.draw(this.ctx);
        });
        
        // 敵の弾の描画
        this.enemyBullets.forEach(bullet => {
            bullet.draw(this.ctx);
        });
        
        // パワーアップアイテムの描画
        this.powerUps.forEach(powerUp => {
            powerUp.draw(this.ctx);
        });
        
        // 爆発エフェクトの描画
        this.explosions.forEach(explosion => {
            explosion.draw(this.ctx);
        });
        
        // グレイズエフェクトの描画
        this.grazeEffects.forEach(effect => {
            effect.draw(this.ctx);
        });
    }
    
    // 背景の描画
    drawBackground() {
        // 単色の背景
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 星の描画
        this.stars.forEach(star => {
            const alpha = star.brightness;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }
    
    // スコア加算
    addScore(points) {
        // コンボ倍率を適用
        const finalPoints = Math.floor(points * this.comboMultiplier);
        this.score += finalPoints;
        
        // 一定スコアごとにレベルアップ
        if (this.score >= this.level * 1000) {
            this.level++;
        }
    }
    
    // グレイズ処理
    graze(bullet) {
        this.grazeCount++;
        
        // グレイズボーナススコア（グレイズ数が増えるほどボーナスも増加）
        const bonusScore = this.grazeBonus * Math.min(this.grazeCount, 10);
        this.addScore(bonusScore);
        
        // グレイズエフェクトを生成
        this.createGrazeEffect(bullet.x, bullet.y);
    }
    
    // コンボ継続
    continueCombo() {
        this.combo++;
        this.comboTimer = 0;
        
        // コンボ倍率の更新
        this.comboMultiplier = Math.min(1 + Math.floor(this.combo / 5), this.maxComboMultiplier);
    }
    
    // コンボリセット
    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
    }
    
    // ライフ減少
    loseLife() {
        this.lives--;
        // ダメージでコンボリセット
        this.resetCombo();
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
}

// プレイヤークラス
class Player {
    constructor(game) {
        this.game = game;
        this.width = 30;
        this.height = 40;
        this.x = game.width / 2 - this.width / 2;
        this.y = game.height - this.height - 20;
        this.speed = 5;
        this.color = '#00FFFF';
        
        // 弾の発射間隔の管理
        this.shootTimer = 0;
        this.shootInterval = 300; // ミリ秒
        
        // 無敵時間の管理
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 2000; // ミリ秒
        this.blinkInterval = 100; // 点滅間隔（ミリ秒）
        this.visible = true;
        
        // パワーアップ状態
        this.powerLevel = 1; // 1: 通常, 2: 二連射, 3: 三連射
        this.powerTimer = 0;
        this.powerDuration = 10000; // パワーアップ持続時間（ミリ秒）
    }
    
    update(deltaTime) {
        // キー入力に基づく移動
        if (this.game.keys.ArrowLeft) {
            this.x -= this.speed;
        }
        if (this.game.keys.ArrowRight) {
            this.x += this.speed;
        }
        if (this.game.keys.ArrowUp) {
            this.y -= this.speed;
        }
        if (this.game.keys.ArrowDown) {
            this.y += this.speed;
        }
        
        // 画面外に出ないように制限
        this.x = Math.max(0, Math.min(this.game.width - this.width, this.x));
        this.y = Math.max(0, Math.min(this.game.height - this.height, this.y));
        
        // 弾の発射
        this.shootTimer += deltaTime;
        if (this.game.keys[' '] && this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
        
        // 無敵時間の管理
        if (this.invincible) {
            this.invincibleTimer += deltaTime;
            
            // 点滅効果
            if (this.invincibleTimer % (this.blinkInterval * 2) < this.blinkInterval) {
                this.visible = true;
            } else {
                this.visible = false;
            }
            
            // 無敵時間終了
            if (this.invincibleTimer >= this.invincibleDuration) {
                this.invincible = false;
                this.visible = true;
            }
        }
        
        // パワーアップ時間の管理
        if (this.powerLevel > 1) {
            this.powerTimer += deltaTime;
            if (this.powerTimer >= this.powerDuration) {
                this.powerLevel = 1;
                this.powerTimer = 0;
            }
        }
    }
    
    shoot() {
        // パワーレベルに応じた弾の発射
        switch (this.powerLevel) {
            case 1: // 通常弾
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + this.width / 2 - 2,
                        this.y
                    )
                );
                break;
                
            case 2: // 二連射
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + 5,
                        this.y + 5
                    )
                );
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + this.width - 5,
                        this.y + 5
                    )
                );
                break;
                
            case 3: // 三連射
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + this.width / 2 - 2,
                        this.y
                    )
                );
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + 5,
                        this.y + 10,
                        -0.3
                    )
                );
                this.game.playerBullets.push(
                    new PlayerBullet(
                        this.game,
                        this.x + this.width - 5,
                        this.y + 10,
                        0.3
                    )
                );
                break;
        }
    }
    
    // パワーアップ
    powerUp() {
        if (this.powerLevel < 3) {
            this.powerLevel++;
        }
        this.powerTimer = 0;
    }
    
    // ダメージ処理
    takeDamage() {
        if (!this.invincible) {
            this.game.loseLife();
            this.invincible = true;
            this.invincibleTimer = 0;
            
            // パワーレベルを下げる
            if (this.powerLevel > 1) {
                this.powerLevel--;
            }
        }
    }
    
    draw(ctx) {
        // 無敵時間中で非表示の場合は描画しない
        if (!this.visible) return;
        
        // 三角形の宇宙船
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // エンジンの炎（簡易版）
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 - 5, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height + 10);
        ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }
}

// プレイヤーの弾クラス
class PlayerBullet {
    constructor(game, x, y, angleOffset = 0) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = 10;
        this.color = '#FFFF00';
        this.angleOffset = angleOffset; // 弾の角度オフセット（左右に発射する場合に使用）
    }
    
    update(deltaTime) {
        // 上に移動（角度オフセットがある場合は斜めに）
        this.y -= this.speed;
        this.x += this.speed * this.angleOffset;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 弾の軌跡（エフェクト）
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(this.x, this.y + this.height, this.width, 5);
    }
}

// 敵クラス
class Enemy {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        
        // 敵の種類に応じたプロパティの設定
        switch (type) {
            case EnemyType.SMALL:
                this.width = 20;
                this.height = 20;
                this.speed = 2;
                this.health = 1;
                this.color = '#FF0000';
                this.points = 100;
                this.shootInterval = 2000; // 2秒ごとに発射
                this.bulletPattern = BulletPatternType.SINGLE;
                break;
                
            case EnemyType.MEDIUM:
                this.width = 30;
                this.height = 30;
                this.speed = 1.5;
                this.health = 2;
                this.color = '#FF6600';
                this.points = 300;
                this.shootInterval = 1500; // 1.5秒ごとに発射
                this.bulletPattern = BulletPatternType.STRAIGHT;
                break;
                
            case EnemyType.LARGE:
                this.width = 40;
                this.height = 40;
                this.speed = 1;
                this.health = 3;
                this.color = '#FF9900';
                this.points = 500;
                this.shootInterval = 1000; // 1秒ごとに発射
                this.bulletPattern = BulletPatternType.CIRCLE;
                break;
                
            case EnemyType.BOSS:
                this.width = 80;
                this.height = 80;
                this.speed = 0.5;
                this.health = 20;
                this.color = '#FF0066';
                this.points = 1000;
                this.shootInterval = 800; // 0.8秒ごとに発射
                this.bulletPattern = BulletPatternType.SPIRAL;
                break;
        }
        
        // 移動パターンの設定
        this.movementPattern = Math.floor(Math.random() * 3); // 0: 直線, 1: ジグザグ, 2: 円運動
        this.movementTimer = 0;
        this.movementDirection = 1; // 1: 右, -1: 左
        this.centerX = x; // 円運動の中心X座標
        
        // 弾の発射管理
        this.shootTimer = 0;
        this.bulletPatternManager = new BulletPatternManager(game);
    }
    
    update(deltaTime) {
        // 移動パターンに応じた移動
        this.move(deltaTime);
        
        // 弾の発射
        this.shootTimer += deltaTime;
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
    }
    
    move(deltaTime) {
        // 移動パターンに応じた移動
        switch (this.movementPattern) {
            case 0: // 直線移動
                this.y += this.speed;
                break;
                
            case 1: // ジグザグ移動
                this.y += this.speed;
                this.movementTimer += deltaTime;
                
                // 一定時間ごとに方向転換
                if (this.movementTimer > 1000) {
                    this.movementDirection *= -1;
                    this.movementTimer = 0;
                }
                
                this.x += this.speed * this.movementDirection;
                
                // 画面端で反転
                if (this.x < 0 || this.x > this.game.width - this.width) {
                    this.movementDirection *= -1;
                }
                break;
                
            case 2: // 円運動
                this.y += this.speed * 0.5;
                this.movementTimer += deltaTime;
                
                // 円運動の半径
                const radius = 50;
                
                // 円運動の角度（ラジアン）
                const angle = this.movementTimer / 1000;
                
                // 円運動の計算
                this.x = this.centerX + Math.sin(angle) * radius;
                
                // 画面端で中心位置を調整
                if (this.x < 0 || this.x > this.game.width - this.width) {
                    this.centerX = Math.max(radius, Math.min(this.game.width - radius, this.centerX));
                }
                break;
        }
    }
    
    shoot() {
        // 弾幕パターンに応じた弾の発射
        this.bulletPatternManager.createPattern(
            this.bulletPattern,
            this.x + this.width / 2,
            this.y + this.height,
            this.type
        );
    }
    
    // ダメージ処理
    takeDamage() {
        this.health--;
        
        // 体力がなくなったら撃破
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        
        return false;
    }
    
    // 撃破処理
    destroy() {
        // スコア加算
        this.game.addScore(this.points);
        
        // パワーアップアイテムのドロップ（確率で）
        if (Math.random() < 0.2) {
            this.dropPowerUp();
        }
        
        // 敵リストから削除（Game.checkCollisions()で行う）
    }
    
    // パワーアップアイテムのドロップ
    dropPowerUp() {
        const powerUp = new PowerUp(
            this.game,
            this.x + this.width / 2 - 10,
            this.y + this.height
        );
        this.game.powerUps.push(powerUp);
    }
    
    draw(ctx) {
        // 敵の種類に応じた描画
        ctx.fillStyle = this.color;
        
        switch (this.type) {
            case EnemyType.SMALL:
                // 小型敵：三角形（下向き）
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y + this.height);
                ctx.lineTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.closePath();
                ctx.fill();
                break;
                
            case EnemyType.MEDIUM:
                // 中型敵：ダイヤモンド形
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case EnemyType.LARGE:
                // 大型敵：六角形
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 4, this.y);
                ctx.lineTo(this.x + this.width * 3/4, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width * 3/4, this.y + this.height);
                ctx.lineTo(this.x + this.width / 4, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case EnemyType.BOSS:
                // ボス敵：複雑な形状
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width * 3/4, this.y + this.height / 4);
                ctx.lineTo(this.x + this.width, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width * 3/4, this.y + this.height * 3/4);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.lineTo(this.x + this.width / 4, this.y + this.height * 3/4);
                ctx.lineTo(this.x, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 4, this.y + this.height / 4);
                ctx.closePath();
                ctx.fill();
                
                // ボスの体力ゲージ
                const healthPercentage = this.health / 20;
                ctx.fillStyle = '#00FF00';
                ctx.fillRect(this.x, this.y - 10, this.width * healthPercentage, 5);
                ctx.strokeStyle = '#FFFFFF';
                ctx.strokeRect(this.x, this.y - 10, this.width, 5);
                break;
        }
    }
}

// 敵の弾クラス
class EnemyBullet {
    constructor(game, x, y, speedX, speedY, color = '#FF0000', size = 5) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
    }
    
    update(deltaTime) {
        // 移動
        this.x += this.speedX;
        this.y += this.speedY;
    }
    
    draw(ctx) {
        // 円形の弾
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 弾の軌跡（エフェクト）
        ctx.fillStyle = `rgba(${parseInt(this.color.slice(1, 3), 16)}, ${parseInt(this.color.slice(3, 5), 16)}, ${parseInt(this.color.slice(5, 7), 16)}, 0.5)`;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 - this.speedX, this.y + this.height / 2 - this.speedY, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 弾幕パターン管理クラス
class BulletPatternManager {
    constructor(game) {
        this.game = game;
    }
    
    createPattern(patternType, x, y, enemyType) {
        // 敵の種類に応じた弾の色と大きさ
        let bulletColor, bulletSize;
        
        switch (enemyType) {
            case EnemyType.SMALL:
                bulletColor = '#FF0000';
                bulletSize = 4;
                break;
                
            case EnemyType.MEDIUM:
                bulletColor = '#FF6600';
                bulletSize = 5;
                break;
                
            case EnemyType.LARGE:
                bulletColor = '#FF9900';
                bulletSize = 6;
                break;
                
            case EnemyType.BOSS:
                bulletColor = '#FF0066';
                bulletSize = 7;
                break;
                
            default:
                bulletColor = '#FF0000';
                bulletSize = 5;
        }
        
        // パターンに応じた弾の生成
        switch (patternType) {
            case BulletPatternType.SINGLE:
                // 単発弾
                this.createSingleBullet(x, y, bulletColor, bulletSize);
                break;
                
            case BulletPatternType.STRAIGHT:
                // 直線弾（3発）
                this.createStraightBullets(x, y, bulletColor, bulletSize);
                break;
                
            case BulletPatternType.CIRCLE:
                // 円形弾（8方向）
                this.createCircleBullets(x, y, bulletColor, bulletSize);
                break;
                
            case BulletPatternType.SPIRAL:
                // 螺旋弾（12方向、回転）
                this.createSpiralBullets(x, y, bulletColor, bulletSize);
                break;
                
            case BulletPatternType.RANDOM:
                // ランダム弾（5発、ランダム方向）
                this.createRandomBullets(x, y, bulletColor, bulletSize);
                break;
        }
    }
    
    // 単発弾
    createSingleBullet(x, y, color, size) {
        const speedY = 3;
        this.game.enemyBullets.push(
            new EnemyBullet(this.game, x - size / 2, y, 0, speedY, color, size)
        );
    }
    
    // 直線弾（3発）
    createStraightBullets(x, y, color, size) {
        const speedY = 3;
        
        // 中央
        this.game.enemyBullets.push(
            new EnemyBullet(this.game, x - size / 2, y, 0, speedY, color, size)
        );
        
        // 左
        this.game.enemyBullets.push(
            new EnemyBullet(this.game, x - 15 - size / 2, y, 0, speedY, color, size)
        );
        
        // 右
        this.game.enemyBullets.push(
            new EnemyBullet(this.game, x + 15 - size / 2, y, 0, speedY, color, size)
        );
    }
    
    // 円形弾（8方向）
    createCircleBullets(x, y, color, size) {
        const bulletCount = 8;
        const speed = 2;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            const speedX = Math.sin(angle) * speed;
            const speedY = Math.cos(angle) * speed;
            
            this.game.enemyBullets.push(
                new EnemyBullet(this.game, x - size / 2, y, speedX, speedY, color, size)
            );
        }
    }
    
    // 螺旋弾（12方向、回転）
    createSpiralBullets(x, y, color, size) {
        const bulletCount = 12;
        const speed = 2;
        
        // 現在の時間に基づく回転角度
        const rotationOffset = Date.now() / 1000 * Math.PI;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = rotationOffset + (Math.PI * 2 / bulletCount) * i;
            const speedX = Math.sin(angle) * speed;
            const speedY = Math.cos(angle) * speed;
            
            this.game.enemyBullets.push(
                new EnemyBullet(this.game, x - size / 2, y, speedX, speedY, color, size)
            );
        }
    }
    
    // ランダム弾（5発、ランダム方向）
    createRandomBullets(x, y, color, size) {
        const bulletCount = 5;
        const speed = 2;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speedX = Math.sin(angle) * speed;
            const speedY = Math.cos(angle) * speed;
            
            this.game.enemyBullets.push(
                new EnemyBullet(this.game, x - size / 2, y, speedX, speedY, color, size)
            );
        }
    }
}

// パワーアップアイテムクラス
class PowerUp {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 2;
        this.color = '#00FF00';
    }
    
    update(deltaTime) {
        // 下に移動
        this.y += this.speed;
    }
    
    draw(ctx) {
        // 星形のパワーアップアイテム
        ctx.fillStyle = this.color;
        
        // 点滅効果
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = '#FFFF00';
        }
        
        // 星形の描画（簡易版）
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height * 0.4);
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.4);
        ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.6);
        ctx.lineTo(this.x + this.width * 0.9, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height * 0.8);
        ctx.lineTo(this.x + this.width * 0.1, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.6);
        ctx.lineTo(this.x, this.y + this.height * 0.4);
        ctx.lineTo(this.x + this.width * 0.3, this.y + this.height * 0.4);
        ctx.closePath();
        ctx.fill();
    }
}

// 爆発エフェクトクラス
class Explosion {
    constructor(game, x, y, color) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.maxRadius = 30;
        this.expandSpeed = 1;
        this.alpha = 1;
        this.fadeSpeed = 0.05;
    }
    
    update(deltaTime) {
        // 爆発の拡大
        this.radius += this.expandSpeed;
        
        // 透明度の減少
        if (this.radius > this.maxRadius / 2) {
            this.alpha -= this.fadeSpeed;
        }
    }
    
    draw(ctx) {
        // 爆発エフェクト（円形の拡大と透明化）
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // 爆発エフェクトの終了判定
    isFinished() {
        return this.alpha <= 0;
    }
}

// グレイズエフェクトクラス
class GrazeEffect {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = 25;
        this.expandSpeed = 0.8;
        this.alpha = 1;
        this.fadeSpeed = 0.04;
        this.color = '#00FFFF';
    }
    
    update(deltaTime) {
        // エフェクトの拡大
        this.radius += this.expandSpeed;
        
        // 透明度の減少
        this.alpha -= this.fadeSpeed;
    }
    
    draw(ctx) {
        // グレイズエフェクト（青い輪の拡大と透明化）
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内側にもう一つの輪
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
    
    // エフェクトの終了判定
    isFinished() {
        return this.alpha <= 0 || this.radius >= this.maxRadius;
    }
}

// ゲームの初期化と開始
window.addEventListener('load', () => {
    console.log('ページが読み込まれました');
    const game = new Game();
    console.log('ゲームインスタンスが作成されました');
});

