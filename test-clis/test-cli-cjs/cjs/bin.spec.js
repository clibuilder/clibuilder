"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fixture_1 = require("@unional/fixture");
(0, fixture_1.baseline)('fixtures', ({ caseName, casePath, caseType, resultPath, match }) => {
    test(caseName, async () => {
        (0, fixture_1.writeCommandResult)(resultPath, await (0, fixture_1.execCommand)({ caseType, caseName, casePath }));
        return match();
    });
});
