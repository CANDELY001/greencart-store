import React from "react";
import MainBanner from "../components/MainBanner";
import Categories from "../components/Categories";
import BestSeller from "../components/BestSeller";
import FeaturesBanner from "../components/FeaturesBanner";
import NewLetter from "../components/NewLetter";

function Home() {
  return (
    <div className="mt-10">
      <MainBanner />
      <Categories />
      <BestSeller />
      <FeaturesBanner />
      <NewLetter />
    </div>
  );
}

export default Home;
