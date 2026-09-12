default:
    @just --list

install:
    npm install

typecheck:
    npm run typecheck

test:
    npm test

test-watch:
    npm run test:watch

check:
    npm run check

prepack:
    npm run prepack
