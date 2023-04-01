from copy import deepcopy
import numpy as np
import dask
import dask.bag as bag
from dask.diagnostics import ProgressBar

def concatenate_strings(strings):
    return (''.join(string for string in strings))

class keyboard:             
    keys = []
    
    distance = np.array([1.03, 1.03, 1.03, 1.03, 1.25, 1.60, 1.03, 1.03, 1.03, 1.03,
                0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0,
                1.12, 1.12, 1.12, 1.12, 1.8, 1.12, 1.12])
    
    #mapping each key position to corresponding finger assignment
    fingers = {0:'l4',1:'l3',2:'l2',3:'l1',4:'l1',5:'r1',6:'r1',7:'r2',8:'r3',9:'r4',
               10:'l4',11:'l3',12:'l2',13:'l1',14:'l1',15:'r1',16:'r1',17:'r2',18:'r3',
               19:'l4',20:'l3',21:'l2',22:'l1',23:'l1',24:'r1',25:'r1'}
    
    map = {}
    
    transitions = []
    
    def __init__(self):
        self.keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                     'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
                     'z', 'x', 'c', 'v', 'b', 'n', 'm']
        #maps each distance to a list of key positions
        for dist in list(set(self.distance)):
            self.map[dist] = []
        for i in range(len(self.distance)):
            self.map[self.distance[i]].append(i)
        #initialise valid transitions
        transitions = set()
        for distance in self.map.keys():
            for i in range(len(self.map[distance])):
                x1 = self.map[distance][i]
                for j in range(i + 1, len(self.map[distance])):
                    x2 = self.map[distance][j]
                    if (x2, x1) not in transitions:
                        transitions.add((x1, x2))
                for other_distance in self.map.keys():
                    if other_distance == distance:
                        continue
                    for j in range(len(self.map[other_distance])):
                        x2 = self.map[other_distance][j]
                        if (x2, x1) not in transitions:
                            transitions.add((x1, x2))
        self.transitions = np.array(list(transitions))

    def printkeys(self):
        print(self.keys[:10])
        print(self.keys[10: 19])
        print(self.keys[19:], '\n')
                
    def swap(self, transition):
        temp = self.keys[transition[0]]
        self.keys[transition[0]] = self.keys[transition[1]]
        self.keys[transition[1]] = temp

    def calc_loss(self, string, penalty = 0.20):
        loss = 0.0
        last_key = -1
        last_key_index = -1
        for key in string:
            if key in self.keys and key != last_key:
                index = self.keys.index(key)
                loss += self.distance[index]
                if last_key != -1 and self.fingers[index] == self.fingers[last_key_index]:
                    loss += penalty
                last_key = key
                last_key_index = index
            elif key != last_key:
                last_key = -1
        return loss

    def cumulative_calc_loss(self, string, next_configs, penalty = 0.20):
        loss = np.zeros(len(self.transitions))
        last_key = -1
        last_key_indices = np.array([-1 for i in range(len(self.transitions))])
        for key in string:
            if key in self.keys and key != last_key:
                for i in range(len(next_configs)):
                    config = next_configs[i]
                    index = config.keys.index(key)
                    loss[i] += config.distance[index]
                    if last_key != -1 and config.fingers[index] == config.fingers[last_key_indices[i]]:
                        loss[i] += penalty
                    last_key_indices[i] = index
                last_key = key
            elif key != last_key:
                last_key = -1
        return loss
    
    def total_loss(self, data, batch_size = 1000, batches = True):
        loss = 0.0
        if batches:
            if len(data) > batch_size:
                for chunk in np.array_split(data, len(data) // batch_size):
                    string = chunk.str.cat(sep = '').lower()
                    loss += self.calc_loss(string)
            else:
                string = data.str.cat(sep = '').lower()
                loss += self.calc_loss(string)
        else:
            string = data.str.cat(sep = '').lower()
            loss += self.calc_loss(string)
        return round(loss, 2)

    def make_next_configs(self):
        next_configs = [deepcopy(self) for i in range(len(self.transitions))]
        for i in range(len(self.transitions)):
            next_configs[i].swap(self.transitions[i])
        return next_configs

    def optimize_counts(self, data):
        counts = np.zeros(len(self.keys))
        for i in range(len(data)):
            string = data.iloc[i]
            for key in string:
                if key in self.keys:
                    counts[self.keys.index(key)] += 1
        print('Initial key config:')
        self.printkeys()
        chunks = bag.from_sequence(data, npartitions = 100)
        concatenated_chunks = chunks.map_partitions(concatenate_strings).compute()
        concatenated_chunks = bag.from_sequence(concatenated_chunks, npartitions = len(concatenated_chunks))
        initial_loss = concatenated_chunks.map(self.calc_loss).sum().compute()
        print('Initial loss: ', initial_loss)
        rank = np.argsort(counts)[::-1]
        j = 0
        new_keys = deepcopy(self.keys)
        for dist in sorted(self.map.keys()):
            for i in range(len(self.map[dist])):
                new_keys[self.map[dist][i]] = self.keys[rank[j]]
                j += 1
        self.keys = new_keys
        print('Count optimized key config:')
        self.printkeys()
        count_optimized_loss = concatenated_chunks.map(self.calc_loss).sum().compute()
        print('Count optimized loss: ', count_optimized_loss)
        
    def fast_optimize_heuristic(self, data):
        trans_count = 0
        epoch = 1
        flag = True
        print('Initial key config:')
        self.printkeys()
        print('Initial loss: ', min_loss)
        while flag:
            flag = False
            for i in range(len(self.transitions)):
                self.swap(self.transitions[i])
                trans_loss = self.total_loss(data)
                if trans_loss < min_loss:
                    min_loss = trans_loss
                    trans_count += 1
                    flag = True
                else:
                    self.swap(self.transitions[i])
            if flag:
                print('Epoch: ', epoch)
                print('Transition(s) made: ', trans_count)
                
                print('Key config:')
                self.printkeys()
                print('Loss: ', min_loss)
                epoch += 1
                trans_count = 0
        print('Optimized key config:')
        self.printkeys()
    
    def slow_optimize_heuristic(self, data):
        print('Initial Key Config:')
        self.printkeys()
        chunks = bag.from_sequence(data, npartitions = 100)
        concatenated_chunks = chunks.map_partitions(concatenate_strings).compute()
        concatenated_chunks = bag.from_sequence(concatenated_chunks, npartitions = len(concatenated_chunks))
        current_loss = concatenated_chunks.map(self.calc_loss).sum().compute()
        print('Loss: ', current_loss)
        def array_sum(arr1, arr2):
            return arr1 + arr2
        epoch = 1
        prev_transition = -1
        flag = True
        with ProgressBar():
            while flag:
                print("Epoch: ", epoch)
                flag = False
                next_configs = self.make_next_configs()
                transition_loss = concatenated_chunks.map(self.cumulative_calc_loss, next_configs = next_configs).fold(array_sum).compute()
                best_transition = np.argsort(transition_loss)[0]
                if transition_loss[best_transition] < current_loss:
                    flag = True
                    current_loss = transition_loss[best_transition]
                    self.swap(self.transitions[best_transition])
                    prev_transition = best_transition
                    epoch += 1
                    print('Transition Made: ', self.transitions[best_transition])
                    print('Current Key Config:')
                    self.printkeys()
                    print('Loss: ', current_loss)
                else:
                    print('Local Minima of loss reached.')
        
    def batch_optimize_heuristic(self, data, batches = 100):
        print("Number of Batches: ", batches)
        batch_num = 1
        for batch in np.array_split(data, batches):
            print('Processing Batch: ', batch_num)
            self.slow_optimize_heuristic(batch)
            batch_num += 1
        chunks = bag.from_sequence(data, npartitions = 100)
        concatenated_chunks = chunks.map_partitions(concatenate_strings).compute()
        concatenated_chunks = bag.from_sequence(concatenated_chunks, npartitions = len(concatenated_chunks))
        batch_minimized_loss = concatenated_chunks.map(self.calc_loss).sum().compute()
        print('Final Key Config:')
        self.printkeys()
        print('Batch Minimized Loss: ', batch_minimized_loss)