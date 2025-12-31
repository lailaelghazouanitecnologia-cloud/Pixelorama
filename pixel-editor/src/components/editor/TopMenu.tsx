import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarCheckboxItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@/components/ui/menubar"
import { useEditorStore } from "@/store/editor-store"

export function TopMenu() {
  const { showGrid, showOnionSkin, toggleGrid, toggleOnionSkin } = useEditorStore()

  return (
    <Menubar className="rounded-none border-b border-t-0 border-x-0 px-2 h-8">
      <MenubarMenu>
        <MenubarTrigger className="text-xs">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New <MenubarShortcut>Ctrl+N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Open <MenubarShortcut>Ctrl+O</MenubarShortcut>
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Open Recent</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>project1.pxl</MenubarItem>
              <MenubarItem>sprite.pxl</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>
            Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Save As... <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Export</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>PNG</MenubarItem>
              <MenubarItem>GIF</MenubarItem>
              <MenubarItem>Spritesheet</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>Quit</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Cut <MenubarShortcut>Ctrl+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Copy <MenubarShortcut>Ctrl+C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Paste <MenubarShortcut>Ctrl+V</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>Delete</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Preferences</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem checked={showGrid} onClick={toggleGrid}>
            Show Grid
          </MenubarCheckboxItem>
          <MenubarCheckboxItem checked={showOnionSkin} onClick={toggleOnionSkin}>
            Onion Skinning
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem>Zoom In <MenubarShortcut>+</MenubarShortcut></MenubarItem>
          <MenubarItem>Zoom Out <MenubarShortcut>-</MenubarShortcut></MenubarItem>
          <MenubarItem>Fit to Window</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Mirror View</MenubarItem>
          <MenubarItem>Tile Mode</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">Image</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Resize Canvas</MenubarItem>
          <MenubarItem>Scale Image</MenubarItem>
          <MenubarItem>Crop to Selection</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Flip Horizontal</MenubarItem>
          <MenubarItem>Flip Vertical</MenubarItem>
          <MenubarItem>Rotate 90° CW</MenubarItem>
          <MenubarItem>Rotate 90° CCW</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Outline</MenubarItem>
          <MenubarItem>Drop Shadow</MenubarItem>
          <MenubarItem>Invert Colors</MenubarItem>
          <MenubarItem>Desaturate</MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Adjustments</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Brightness/Contrast</MenubarItem>
              <MenubarItem>Hue/Saturation</MenubarItem>
              <MenubarItem>Color Balance</MenubarItem>
              <MenubarItem>Posterize</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">Layer</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New Layer</MenubarItem>
          <MenubarItem>New Group</MenubarItem>
          <MenubarItem>Duplicate Layer</MenubarItem>
          <MenubarItem>Delete Layer</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Merge Down</MenubarItem>
          <MenubarItem>Flatten Image</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Layer Properties</MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">Animation</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New Frame</MenubarItem>
          <MenubarItem>Duplicate Frame</MenubarItem>
          <MenubarItem>Delete Frame</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Frame Properties</MenubarItem>
          <MenubarItem>Frame Tags</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Play/Pause <MenubarShortcut>Space</MenubarShortcut></MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Documentation</MenubarItem>
          <MenubarItem>Keyboard Shortcuts</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>About</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
