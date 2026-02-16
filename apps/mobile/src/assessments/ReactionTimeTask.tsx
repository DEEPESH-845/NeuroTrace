import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ReactionMetrics } from '@neurotrace/types';

interface ReactionTimeTaskProps {
  onComplete: (metrics: ReactionMetrics) => void;
  onError?: (error: Error) => void;
}

interface Trial {
  stimulusTime: number;
  responseTime: number | null;
  reactionTime: number | null;
  correct: boolean;
}

const TOTAL_TRIALS = 10;
const MIN_WAIT_TIME = 1000; // 1 second
const MAX_WAIT_TIME = 4000; // 4 seconds
const STIMULUS_TIMEOUT = 2000; // 2 seconds to respond
const STIMULUS_COLOR = '#4CAF50'; // Green
const BACKGROUND_COLOR = '#FFFFFF';

/**
 * ReactionTimeTask component
 * 
 * Displays visual stimuli at random intervals and measures response latency.
 * Calculates mean reaction time, variability, and accuracy.
 * 
 * Requirements: 2.6
 */
export const ReactionTimeTask: React.FC<ReactionTimeTaskProps> = ({ onComplete, onError }) => {
  const [currentTrial, setCurrentTrial] = useState(0);
  const [showStimulus, setShowStimulus] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [isWaiting, setIsWaiting] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  
  const stimulusTimeRef = useRef<number>(0);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stimulusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Generate random wait time between min and max
  const getRandomWaitTime = useCallback(() => {
    return Math.floor(Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME + 1)) + MIN_WAIT_TIME;
  }, []);

  // Start a new trial
  const startTrial = useCallback(() => {
    if (currentTrial >= TOTAL_TRIALS) {
      return;
    }

    setIsWaiting(true);
    setShowStimulus(false);
    scaleAnim.setValue(0);

    const waitTime = getRandomWaitTime();

    waitTimeoutRef.current = setTimeout(() => {
      // Show stimulus
      stimulusTimeRef.current = Date.now();
      setShowStimulus(true);
      setIsWaiting(false);

      // Animate stimulus appearance
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto-advance if no response within timeout
      stimulusTimeoutRef.current = setTimeout(() => {
        handleResponse(false);
      }, STIMULUS_TIMEOUT);
    }, waitTime);
  }, [currentTrial, getRandomWaitTime, scaleAnim]);

  // Handle user response
  const handleResponse = useCallback((wasCorrect: boolean) => {
    const responseTime = Date.now();
    const reactionTime = wasCorrect ? responseTime - stimulusTimeRef.current : null;

    const trial: Trial = {
      stimulusTime: stimulusTimeRef.current,
      responseTime: wasCorrect ? responseTime : null,
      reactionTime,
      correct: wasCorrect,
    };

    setTrials(prev => [...prev, trial]);
    setShowStimulus(false);
    setCurrentTrial(prev => prev + 1);

    // Clear timeouts
    if (stimulusTimeoutRef.current) {
      clearTimeout(stimulusTimeoutRef.current);
      stimulusTimeoutRef.current = null;
    }
  }, []);

  // Handle screen tap
  const handleTap = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
      return;
    }

    if (showStimulus) {
      // Correct response - tapped when stimulus is visible
      handleResponse(true);
    } else if (!isWaiting) {
      // Premature response - tapped too early
      // Don't count as a trial, just ignore
    }
  }, [hasStarted, showStimulus, isWaiting, handleResponse]);

  // Calculate metrics when all trials are complete
  useEffect(() => {
    if (trials.length === TOTAL_TRIALS) {
      try {
        const correctTrials = trials.filter(t => t.correct && t.reactionTime !== null);
        const reactionTimes = correctTrials.map(t => t.reactionTime!);

        if (reactionTimes.length === 0) {
          throw new Error('No valid reaction times recorded');
        }

        // Calculate mean reaction time
        const meanReactionTime = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;

        // Calculate standard deviation (variability)
        const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - meanReactionTime, 2), 0) / reactionTimes.length;
        const reactionTimeVariability = Math.sqrt(variance);

        const metrics: ReactionMetrics = {
          meanReactionTime,
          reactionTimeVariability,
          correctResponses: correctTrials.length,
          totalTrials: TOTAL_TRIALS,
          timestamp: new Date(),
        };

        onComplete(metrics);
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    }
  }, [trials, onComplete, onError]);

  // Start next trial when current trial advances
  useEffect(() => {
    if (hasStarted && currentTrial < TOTAL_TRIALS && trials.length === currentTrial) {
      startTrial();
    }
  }, [hasStarted, currentTrial, trials.length, startTrial]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
      }
      if (stimulusTimeoutRef.current) {
        clearTimeout(stimulusTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleTap}
    >
      <View style={styles.content}>
        {!hasStarted ? (
          <View style={styles.instructionContainer}>
            <Text style={styles.title}>Reaction Time Test</Text>
            <Text style={styles.instruction}>
              Tap the screen as quickly as possible when you see the green circle appear.
            </Text>
            <Text style={styles.instruction}>
              Wait for the circle to appear before tapping.
            </Text>
            <Text style={styles.startPrompt}>Tap anywhere to start</Text>
          </View>
        ) : (
          <>
            <Text style={styles.progressText}>
              Trial {currentTrial + 1} of {TOTAL_TRIALS}
            </Text>
            
            {showStimulus && (
              <Animated.View
                style={[
                  styles.stimulus,
                  {
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              />
            )}

            {isWaiting && (
              <Text style={styles.waitText}>Wait...</Text>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 20,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  startPrompt: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 40,
    textAlign: 'center',
  },
  progressText: {
    position: 'absolute',
    top: 60,
    fontSize: 20,
    color: '#666',
    fontWeight: '500',
  },
  stimulus: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: STIMULUS_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  waitText: {
    fontSize: 24,
    color: '#999',
    fontWeight: '500',
  },
});
