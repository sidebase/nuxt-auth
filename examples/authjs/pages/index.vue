<template>
  <div class="wrapper">
    <div class="margins" style="padding-top: 3rem; ">
      <div class="content">
        <h1 class="heading">
          Welcome to your new <span class="gradient__text">sidebase</span> app!
        </h1>
        <p class="description">
          Read our documentation <a class="hover-underline-animation" href="https://sidebase.io/sidebase/welcome" target="_blank">here</a>.
          Get started in no time with the following amazing modules:
        </p>
      </div>

      <div class="modules_grid">
        <div class="card">
          <WelcomeTailwindDemo />
        </div>
        <div class="card">
          <WelcomeAuthDemo />
        </div>
      </div>
    </div>

    <div class="margins footer">
      <div style="color: #D1D5DB">
        Developed with love by
        <NuxtLink href="https://sidestream.tech" target="_blank" class="hover-underline-animation">
          Sidestream
        </NuxtLink>
      </div>
      <div class="social">
        <NuxtLink href="https://discord.gg/VzABbVsqAc" target="_blank" class="hover-underline-animation">
          Discord
        </NuxtLink>
        <NuxtLink href="https://twitter.com/sidebase_io" target="_blank" class="hover-underline-animation">
          Twitter
        </NuxtLink>
        <NuxtLink href="https://github.com/sidebase" target="_blank" class="hover-underline-animation">
          Github
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    background-color: #eefbfc;
    color: #484848;
  }

  /* Layout */
  .wrapper {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    min-height: 100vh;
    color: #ffffff;
    background-color: #0E0E10;
  }
  .margins {
    padding-left: 1rem;
    padding-right: 1rem;

    @media (min-width: 1024px) {
      padding-left: 5rem;
      padding-right: 5rem;
    }
  }

  /* Heading */
  .content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .content .heading {
    font-size: 2.4rem;
    line-height: 2.25rem;
    font-weight: 700;

    @media (min-width: 1280px) {
      font-size: 3rem;
      line-height: 1;
    }
  }

  .content .description {
    font-size: 1.125rem;
    line-height: 1.75rem;
    color: #9CA3AF;

    @media (min-width: 1280px) {
      font-size: 1.25rem;
      line-height: 1.75rem;
    }
  }

  /* Modules */
  .modules_grid {
    display: grid;
    margin-top: 2.5rem;
    gap: 2rem;

    @media (min-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (min-width: 1280px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .card {
    position: relative;
    padding: 30px;
    border-radius: 10px;
    transition: 0.5s;
    box-shadow: inset 5px 5px 5px rgba(0, 0, 0, 0.2),
    inset -5px -5px 15px rgba(255, 255, 255, 0.1),
    5px 5px 15px rgba(0, 0, 0, 0.3), -5px -5px 15px rgba(255, 255, 255, 0.1);
  }

  .card .layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: space-between;
    height: 100%;
  }

  .card .layout .group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card .layout .heading {
    font-size: 1.5rem;
    line-height: 2rem;
    font-weight: 700;
  }

  .card .layout .description {
    color: #D1D5DB;
  }

  .card .layout .group .actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Footer */
  .footer {
    display: flex;
    padding-top: 1rem;
    padding-bottom: 1rem;
    margin-top: 2.5rem;
    justify-content: space-between;
    align-items: center;
    border-top-width: 1px;
    border-color: #1F2937;
    width: 100%;
  }

  .footer .social {
    display: flex;
    gap: 1.25rem;
    align-items: center;
  }

  /* Special */
  .gradient__text {
    background: linear-gradient(to right, #7bceb6 10%, #12a87b 40%, #0FCF97 60%, #7bceb6 90%);
    background-size: 200% auto;
    color: #000;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shine 1s linear infinite;
  }

  @keyframes shine {
    to {
      background-position: 200% center;
    }
  }
  .hover-underline-animation {
    display: inline-block;
    position: relative;
    color: #5BF3C7;
    text-decoration: none;
  }

  .hover-underline-animation::after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 2px;
    bottom: 0;
    left: 0;
    background-color: #5BF3C7;
    transform-origin: bottom right;
    transition: transform 0.25s ease-out;
  }

  .hover-underline-animation:hover::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }
</style>
