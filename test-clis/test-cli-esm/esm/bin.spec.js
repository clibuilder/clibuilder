import { baseline, execCommand, writeCommandResult } from '@unional/fixture';
baseline('fixtures', ({ caseName, casePath, caseType, resultPath, match }) => {
    test(caseName, async () => {
        writeCommandResult(resultPath, await execCommand({ caseType, caseName, casePath }));
        return match();
    });
});
