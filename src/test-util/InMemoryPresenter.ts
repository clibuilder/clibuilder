import { DisplayLevel, Enquirer, PlainPresenter, PresenterOption } from '../presenter'
import { InMemoryDisplay } from './InMemoryDisplay'

export class InMemoryPresenter extends PlainPresenter {
  display = new InMemoryDisplay()
  displayLevel = DisplayLevel.Verbose
  constructor(options?: PresenterOption, public answers: Record<string, (QuestionHandler) | string | number | boolean> = {}) {
    super(options)
    this.inquire = Object.assign(
      (questions: Enquirer.prompt.Question[]) => {
        return Promise.resolve(questions.reduce((p, q) => {
          // istanbul ignore next
          if (q.name) {
            const name = q.name
            const answer = this.answers[name]
            p[name] = typeof answer === 'function' ? answer(q) : answer
          }
          return p
        }, {} as Record<string, any>))
      },
      {
        ...this.inquire,
      }) as any
  }
}

export type QuestionHandler = (question: Enquirer.prompt.Question) => any
