// Canvas — lays out every screen for review

function App() {
  return (
    <DesignCanvas>
      <DCSection id="setup" title="Game flow" subtitle="From start to finish">
        <DCArtboard id="new-game"  label="New game"        width={1180} height={820}>
          <NewGameScreen />
        </DCArtboard>
        <DCArtboard id="handoff"   label="Hot-seat handoff" width={1180} height={820}>
          <HandoffScreen />
        </DCArtboard>
        <DCArtboard id="end"       label="Game end"         width={1180} height={820}>
          <GameEndScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="ingame" title="In-game" subtitle="Board, rack, action bar — muted premium squares">
        <DCArtboard id="classic" label="Classic · 15 × 15" width={1180} height={820}>
          <InGameClassicScreen />
        </DCArtboard>
        <DCArtboard id="mini"    label="Mini · 11 × 11"    width={1180} height={820}>
          <InGameMiniScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="modes" title="Solo modes" subtitle="Tumbler and Spelling Bee">
        <DCArtboard id="tumbler"     label="Tumbler · live" width={1180} height={820}>
          <TumblerScreen />
        </DCArtboard>
        <DCArtboard id="tumbler-end" label="Tumbler · end"  width={1180} height={820}>
          <TumblerEndScreen />
        </DCArtboard>
        <DCArtboard id="bee"         label="Spelling Bee"   width={1180} height={820}>
          <SpellingBeeScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="modals" title="Modals" subtitle="Overlay style — dim backdrop + centred panel">
        <DCArtboard id="blank"  label="Pick a letter (blank)" width={1180} height={820}>
          <BlankPickerScreen />
        </DCArtboard>
        <DCArtboard id="swap"   label="Swap tiles"            width={1180} height={820}>
          <SwapPickerScreen />
        </DCArtboard>
        <DCArtboard id="resign" label="Resign · destructive"  width={1180} height={820}>
          <ResignConfirmScreen />
        </DCArtboard>
        <DCArtboard id="name"   label="User name prompt"      width={1180} height={820}>
          <NamePromptScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Phone portrait · 480 × 900" subtitle="Trickiest two screens shown for layout reflow">
        <DCArtboard id="m-classic" label="In-game · phone"    width={480} height={900}>
          <InGameClassicMobile />
        </DCArtboard>
        <DCArtboard id="m-bee"     label="Spelling Bee · phone" width={480} height={900}>
          <SpellingBeeMobile />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
