// Correction
cgen_correctionDir = "data"
cgen_correctionApp = "correction_calc.exe"		// Linear polyfit function
cgen_correction2App = "correction2_calc.exe"	// Quadratic polyfit function
cgen_correctionFlag = "correction_flag.csv"

function CGEN_SaveArrays(FileName, UnitData, ScopeData, ErrorData)
{
	var csv_array = [];
	
	for (var i = 0; i < UnitData.length; i++)
		csv_array.push(UnitData[i] + ";" + ScopeData[i] + ";" + ErrorData[i]);
	
	save(cgen_correctionDir + "/" + FileName + ".csv", csv_array);
}

function CGEN_UseQuadraticCorrection()
{
	// Check connection
	dev.r(0);
	
	try
	{
		return dev.r(254);
	}
	catch(e)
	{
		return dev.r(126);
	}
}

function CGEN_WaitForCorrection(Message)
{
	print(Message);
	var res = [];
	
	do
	{
		res = load(cgen_correctionDir + "/" + cgen_correctionFlag);
		sleep(1000);
	}
	while(res[0] == 0 && !anykey())
}

// Linear correction
function CGEN_GetCorrection(Filename)
{
	// reset flag
	save(cgen_correctionDir + "/" + cgen_correctionFlag, [0])
	
	var Args = cgen_correctionDir + " " + Filename + " " + cgen_correctionFlag
	exec(cgen_correctionApp, Args)
	
	CGEN_WaitForCorrection("Correcting " + Filename + "...")
	return CGEN_CorrectionToFloat(load(cgen_correctionDir + "/" + Filename + "_corr.csv"))
}

// Quadratic correction
function CGEN_GetCorrection2(Filename)
{
	// reset flag
	save(cgen_correctionDir + "/" + cgen_correctionFlag, [0])
	
	var Args = cgen_correctionDir + " " + Filename + " " + cgen_correctionFlag
	exec(cgen_correction2App, Args)
	
	CGEN_WaitForCorrection("Correcting " + Filename + "...")
	return CGEN_CorrectionToFloat(load(cgen_correctionDir + "/" + Filename + "_corr.csv"))
}

function CGEN_CorrectionToFloat(InputData)
{
	for(var i = 0; i < InputData.length; i++)
		InputData[i] = parseFloat(InputData[i])
	
	return InputData
}

function CGEN_GetRange(Start, End, Step)
{
	var ResArray = [];
	var Num = ((End - Start) / Step);
	var N = Math.round(Num) ? Math.round(Num) : 0;
	var Value = Start;

	for (var i = 0; i <= N; i++)
	{
		ResArray.push(Value);
		Value += Step;
		if (Value > End) Value = End;
	}
	
	return ResArray;
}

function CGEN_GetRangeLogarithm(Start, End, Num)
{
	var ResArray = [];
	var N = Num - 1;
	var x = Math.pow(End / Start, 1 / N);

	for (var i = 0; i <= N; i++)
		ResArray.push(Math.round(Start * Math.pow(x, i)));

	return ResArray;
}

function CGEN_GetRandomInt(Min, Max)
{
	return Math.floor(Math.random() * (Max - Min)) + Min;
}

function CGEN_Normalize(Data)
{
	var ResArray = [];
	var Max = Math.abs(Data[0]);
	
	for (var i = 0; i < Data.length; i++)
		if (Max < Math.abs(Data[i])) Max = Math.abs(Data[i]);
	
	for (var i = 0; i < Data.length; i++)
		ResArray[i] = (Data[i] / Max).toFixed(4);
	
	return ResArray;
}