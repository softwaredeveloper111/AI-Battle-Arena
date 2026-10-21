import styled from 'styled-components';

const SpinnerLoader = () => {
  return (
    <StyledWrapper>
      <div className="spinner">
        <div className="spinnerin" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(8, 8, 8, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  overflow: hidden;

  .spinner {
    position: relative;
    width: 3.5em;
    height: 3.5em;
    cursor: not-allowed;
    border-radius: 50%;
    border: 2px solid #333;
    box-shadow:
      -10px -10px 10px #6359f8,
      0px -10px 10px 0px #9c32e2,
      10px -10px 10px #f36896,
      10px 0 10px #ff0b0b,
      10px 10px 10px 0px #ff5500,
      0 10px 10px 0px #ff9500,
      -10px 10px 10px 0px #ffb700;
    animation: rot55 0.7s linear infinite;
  }

  .spinnerin {
    border: 2px solid #333;
    width: 1.75em;
    height: 1.75em;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes rot55 {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default SpinnerLoader;
