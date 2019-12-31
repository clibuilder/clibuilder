import { Answers, DistinctQuestion } from 'inquirer'
import { DisplayLevel, PlainPresenter, PresenterOption } from '../presenter'
import { InMemoryDisplay } from './InMemoryDisplay'

export class InMemoryPresenter extends PlainPresenter {
  display = new InMemoryDisplay()
  displayLevel = DisplayLevel.Verbose
  constructor(options: PresenterOption, public answers: Record<string, (QuestionHandler) | string | number | boolean> = {}) {
    super(options)
    this.inquire = Object.assign(
      (questions: DistinctQuestion[]) => {
        return Promise.resolve(questions.reduce((p, q) => {
          // istanbul ignore next
          if (q.name) {
            const answer = answers[q.name]
            p[q.name] = typeof answer === 'function' ? answer(q) : answer
          }
          return p
        }, {} as Answers))
      },
      {
        ...this.inquire,
      }) as any
  }
}

export type QuestionHandler<Q extends DistinctQuestion = any> = (question: Q) => any
