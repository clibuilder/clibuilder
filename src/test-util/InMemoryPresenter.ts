import { DisplayLevel } from '../Display'
import { PlainPresenter } from '../PlainPresenter'

import { InMemoryDisplay } from './InMemoryDisplay'

export class InMemoryPresenter extends PlainPresenter {
  display = new InMemoryDisplay()
  displayLevel = DisplayLevel.Verbose
}
