import React, {useState} from "react";

import AccordionItem from "./item/AccordionItem";
import {AccordionData} from "./util/accordionTypes";

interface AccordionProps {
  accordionData: AccordionData[];
}

function Accordion({accordionData}: AccordionProps) {
  const [clicked, setClicked] = useState("0");

  return (
    <ul className={"accordion"}>
      {accordionData.map((data, index) => (
        <AccordionItem
          key={data.id}
          data={data}
          // eslint-disable-next-line
          onToggle={() => handleToggle(index)}
          isActive={String(index) === clicked}
        />
      ))}
    </ul>
  );

  function handleToggle(index: number) {
    if (clicked === String(index)) {
      setClicked("0");
    }

    setClicked(String(index));
  }
}

export default Accordion;
