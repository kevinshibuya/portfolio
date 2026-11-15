import type { ReactElement } from 'react'
import { SelectedWork } from '../components/sections/SelectedWork'
import { MoreWork } from '../components/sections/MoreWork'
import { Closing } from '../components/layout/Closing'

export { About } from '../components/sections/About'

/** The home page under its opening: the selected work, the black section, the close. */
export function HomeSections(): ReactElement {
  return (
    <>
      <SelectedWork />
      <MoreWork />
      <Closing />
    </>
  )
}
