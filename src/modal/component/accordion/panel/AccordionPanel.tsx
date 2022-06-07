import "./_accordion-panel.scss";

import React from "react";

interface AccordionPanelProps {
  children: React.ReactNode;
}

function AccordionPanel({children}: AccordionPanelProps) {
  return (
    <div className={"accordion-panel"}>
      <div className={"accordion-panel__description"}>{children}</div>
    </div>
  );
}

export default AccordionPanel;
