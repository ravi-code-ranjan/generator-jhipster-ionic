const chalk = require('chalk');
const packagejs = require('../../package.json');
const jsonfile = require('jsonfile');
const semver = require('semver');
const shelljs = require('shelljs');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const prompts = require('./prompts');
const writeFiles = require('./files').writeFiles;
const modifyPackage = require('modify-package-dependencies');

module.exports = class extends BaseGenerator {

    get initializing() {
        return {
            readConfig() {
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                //this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(`\nWelcome to the ${chalk.bold.blue('Ionic JHipster')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
            }
        };
    }

    get prompting() {
        return {
            askForProjectName: prompts.askForAppName,
            askForPath: prompts.askForPath
        };
    }

    writing() {
        const fromPath = this.directoryPath + '/.yo-rc.json';
        this.jhipsterAppConfig = this.fs.readJSON(fromPath)['generator-jhipster'];

        const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
        const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
        if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
            this.error(`\nYour backend uses an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`);
        }

        const done = this.async();
        if (shelljs.test('-d', this.ionicAppName)) {
            // todo: prompt to overri
            this.error(`Directory ${this.ionicAppName} already exists, please remove it to continue.`)
        } else {
            this.log(`\nCreating Ionic app with command: ${chalk.yellow(`ionic start ${this.ionicAppName} super`)}`);
            shelljs.exec(`ionic start ${this.ionicAppName} super --no-link --no-deps`, {silent: false}, (code) => {
                if (code === 0) {
                    this.log(`\nIonic app created, integrating JHipster...`);
                    writeFiles.call(this, done);
                } else {
                    let msg = 'Ionic app creation failed. Please create an issue for this on GitHub.\n';
                    msg += 'https://github.com/oktadeveloper/generator-jhipster-ionic/issues';
                    this.error(msg);
                }
            });
        }
    }

    install() {
        // update package.json in Ionic app
        const done = this.async();
        const packagePath = this.ionicAppName + '/package.json';
        const packageJSON = this.fs.readJSON(packagePath);
        modifyPackage.add(packageJSON, ['generator-jhipster@4.10.2', 'ng-jhipster@0.2.12', 'ng2-webstorage@1.8.0'])
            .then(dependencies => {

                modifyPackage.addDev(dependencies, ['@types/node@^8.0.47'])
                    .then(devDependencies => {
                        jsonfile.writeFileSync(packagePath, devDependencies);

                        this.log('\nInstalling dependencies...');
                        shelljs.exec(`cd ${this.ionicAppName} && npm i`, {silent: false}, (code) => {
                            if (code === 0) {
                                done();
                            } else {
                                this.warning(`Failed to run ${chalk.yellow(`npm install`)} in ${this.ionicAppName}!`);
                                this.warning(`Please run it manually before running ${chalk.yellow(`ionic serve`)}`);
                            }
                        });
                    });
            });
    }

    end() {
        this.log('\nApp created successfully! 🎉\n');
        const configPath = chalk.yellow(`${this.directoryPath}/src/main/resources/config/application.yml`);
        this.log(`Enable CORS in ${configPath}, and set the allowed-origins:\n`);
        this.log(`${chalk.green(`    cors:`)}`);
        this.log(`${chalk.green(`        allowed-origins: "http://localhost:8100"`)}\n`);
        this.log('Then run the following commands (in separate terminals) to see it working:\n');
        this.log(`${chalk.green(`    cd ${this.directoryPath} && ${this.jhipsterAppConfig.buildTool === 'maven' ? './mvnw' : './gradlew'}`)}`);
        this.log(`${chalk.green(`    cd ${this.ionicAppName} && ionic serve`)}\n`);
    }
};