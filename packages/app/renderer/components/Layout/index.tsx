import { ReactNode } from "react";
import { Box } from "@mui/material";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";

type Props = {
  children: ReactNode;
  navbarChildren?: ReactNode;
  hideSidebar?: boolean;
};

const area = (...areas: string[]) => `"${areas.join(" ")}"`;

export const Layout = ({
  children,
  navbarChildren,
  hideSidebar = false,
}: Props) => {
  const areaWithSidebar = (mainArea: string) =>
    area(hideSidebar ? mainArea : "sidebar", mainArea);

  const gridTemplateAreas = [
    area("header", "header"),
    areaWithSidebar("main"),
    areaWithSidebar("footer"),
  ].join(" ");

  return (
    <Box
      height="100%"
      display="grid"
      gridTemplateColumns="200px calc(100vw - 200px)"
      gridTemplateRows="64px 1fr min-content"
      gridTemplateAreas={gridTemplateAreas}
    >
      <Header />
      {!hideSidebar && <Sidebar />}
      <Box component="main" gridArea="main" padding="1em">
        {children}
      </Box>
      <Footer />
    </Box>
  );
};
